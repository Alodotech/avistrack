import "server-only";
import type { Admin, AdminMember, AdminRole } from "@/server/domain";
import { recordAdminTeamAction } from "./audit-log-repository";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Accès aux comptes administrateur. L'identité est le compte Supabase Auth
 * (`user_id`) : un administrateur ne peut lire que sa propre ligne via RLS.
 */

function toAdmin(row: { user_id: string; email: string; role?: string; created_at?: string }): Admin {
  return {
    id: row.user_id,
    email: row.email,
    role: (row.role as AdminRole) ?? "admin",
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
  };
}

function toAdminMember(row: {
  id: string;
  user_id: string;
  email: string;
  role?: string;
  created_at: string;
}): AdminMember {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: (row.role as AdminRole) ?? "admin",
    createdAt: new Date(row.created_at),
  };
}

/** Vérifie qu'un compte authentifié est administrateur. */
export async function findAdminById(id: string): Promise<Admin | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admins")
      .select("user_id, email, role, created_at")
      .eq("user_id", id)
      .maybeSingle();
    if (!error && data) return toAdmin(data);
  } catch {
    // Si la session anonyme échoue sur la politique RLS
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("admins")
      .select("user_id, email, role, created_at")
      .eq("user_id", id)
      .maybeSingle();
    if (!error && data) return toAdmin(data);
  } catch {
    // Ignorer en cas d'erreur de connexion
  }

  return null;
}

export const findAdminByUserId = findAdminById;

/**
 * Recherche par e-mail, réservée au serveur : sert aux outils d'administration
 * (les politiques RLS interdisent la recherche pré-authentification).
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id, email, role, created_at")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? toAdmin(data) : null;
}

/**
 * Vérifie si un utilisateur est administrateur lors du retour OAuth et synchronise son user_id.
 */
export async function checkAndSyncAdminOAuth(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const adminClient = createAdminClient();
  const query = adminClient.from("admins").select("user_id, email");

  if (email) {
    query.or(`user_id.eq.${userId},email.ilike.${email}`);
  } else {
    query.eq("user_id", userId);
  }

  const { data: adminRecord } = await query.maybeSingle();

  if (adminRecord) {
    if (adminRecord.user_id !== userId && email) {
      await adminClient
        .from("admins")
        .update({ user_id: userId })
        .ilike("email", email);
    }
    return true;
  }
  return false;
}

/**
 * Liste l'intégralité des membres de l'équipe d'administration AvisTrack.
 */
export async function listAdmins(): Promise<AdminMember[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id, user_id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toAdminMember);
}

/**
 * Ajoute un nouvel utilisateur à l'équipe d'administration (rôle admin ou dirigeant).
 */
export async function addAdmin(options: {
  email: string;
  role: AdminRole;
  actorId: string;
}): Promise<{ ok: true; member: AdminMember } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const email = options.email.trim().toLowerCase();

  // 1. Validation basique d'e-mail
  if (!email || !email.includes("@") || !email.includes(".")) {
    return { ok: false, error: "Adresse e-mail invalide." };
  }

  // 2. Vérification d'unicité dans la table admins
  const { data: existingAdmin } = await supabase
    .from("admins")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existingAdmin) {
    return { ok: false, error: "Cet utilisateur fait déjà partie des administrateurs." };
  }

  // 3. Recherche ou pré-création du compte dans auth.users
  let userId: string | null = null;
  try {
    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const foundUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );
    if (foundUser) {
      userId = foundUser.id;
    } else {
      const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = createdUser.user.id;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur compte Auth";
    return { ok: false, error: `Impossible de préparer le compte : ${message}` };
  }

  if (!userId) {
    return { ok: false, error: "Identifiant utilisateur introuvable." };
  }

  // 4. Insertion dans la table admins
  const { data: inserted, error: insertErr } = await supabase
    .from("admins")
    .insert({
      user_id: userId,
      email,
      role: options.role,
    })
    .select("id, user_id, email, role, created_at")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: insertErr?.message ?? "Erreur lors de l'enregistrement de l'administrateur." };
  }

  // 5. Tracé dans le journal d'audit
  try {
    await recordAdminTeamAction({
      adminId: options.actorId,
      action: "INVITE_ADMIN",
      targetEmail: email,
      role: options.role,
      reason: `Attribution du rôle : ${options.role === "dirigeant" ? "Dirigeant AvisTrack" : "Administrateur"}`,
    });
  } catch {
    // Si l'audit échoue, ne bloque pas l'ajout
  }

  return { ok: true, member: toAdminMember(inserted) };
}

/**
 * Modifie le rôle d'un administrateur (admin <-> dirigeant).
 */
export async function updateAdminRole(options: {
  adminId: string;
  role: AdminRole;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  // 1. Récupération de l'admin cible
  const { data: targetAdmin } = await supabase
    .from("admins")
    .select("id, email, role")
    .eq("id", options.adminId)
    .maybeSingle();

  if (!targetAdmin) {
    return { ok: false, error: "Administrateur introuvable." };
  }

  // 2. Mise à jour du rôle
  const { error: updateErr } = await supabase
    .from("admins")
    .update({ role: options.role })
    .eq("id", options.adminId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  // 3. Tracé dans le journal d'audit
  try {
    await recordAdminTeamAction({
      adminId: options.actorId,
      action: "UPDATE_ADMIN_ROLE",
      targetEmail: targetAdmin.email,
      role: options.role,
      reason: `Nouveau rôle : ${options.role === "dirigeant" ? "Dirigeant AvisTrack" : "Administrateur"} (précédemment : ${targetAdmin.role})`,
    });
  } catch {
    // Ne bloque pas
  }

  return { ok: true };
}

/**
 * Retire un administrateur de l'équipe AvisTrack.
 */
export async function removeAdmin(options: {
  adminId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  // 1. Récupération de l'admin cible
  const { data: targetAdmin } = await supabase
    .from("admins")
    .select("id, user_id, email")
    .eq("id", options.adminId)
    .maybeSingle();

  if (!targetAdmin) {
    return { ok: false, error: "Administrateur introuvable." };
  }

  // 2. Empêcher de supprimer son propre compte
  if (targetAdmin.user_id === options.actorId) {
    return { ok: false, error: "Vous ne pouvez pas révoquer votre propre compte administrateur." };
  }

  // 3. Vérifier qu'il reste au moins un autre administrateur
  const { count } = await supabase
    .from("admins")
    .select("*", { count: "exact", head: true });

  if ((count ?? 0) <= 1) {
    return { ok: false, error: "Impossible de supprimer le dernier administrateur de la plateforme." };
  }

  // 4. Suppression de la table admins
  const { error: deleteErr } = await supabase
    .from("admins")
    .delete()
    .eq("id", options.adminId);

  if (deleteErr) {
    return { ok: false, error: deleteErr.message };
  }

  // 5. Tracé dans le journal d'audit
  try {
    await recordAdminTeamAction({
      adminId: options.actorId,
      action: "REMOVE_ADMIN",
      targetEmail: targetAdmin.email,
      reason: "Révocation complète des droits d'accès administrateur",
    });
  } catch {
    // Ne bloque pas
  }

  return { ok: true };
}
