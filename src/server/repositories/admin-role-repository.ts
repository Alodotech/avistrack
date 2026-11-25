import "server-only";
import { defaultAdminPermissions, parseAdminPermissions } from "@/lib/admin-permissions";
import type {
  AdminPermissions,
  AdminRole,
  AdminRoleDefinition,
} from "@/server/domain";
import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/utils/supabase/admin";
import { recordAdminTeamAction } from "./audit-log-repository";

/**
 * Rôles d'administration personnalisés (module 6).
 *
 * Un rôle porte un jeu de permissions par module ; l'assigner à un membre
 * remplace ses permissions individuelles. La table est réservée au serveur
 * (clé `service_role`), aucune politique RLS n'ouvre l'accès aux clients.
 */

function toRole(row: {
  id: string;
  name: string;
  permissions: Json;
  created_at: string;
}): AdminRoleDefinition {
  return {
    id: row.id,
    name: row.name,
    permissions: parseAdminPermissions(row.permissions, "admin"),
    createdAt: new Date(row.created_at),
  };
}

export async function listAdminRoles(): Promise<AdminRoleDefinition[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_roles")
    .select("id, name, permissions, created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toRole);
}

export async function createAdminRole(input: {
  name: string;
  permissions: AdminPermissions;
  actorId: string;
}): Promise<
  { ok: true; role: AdminRoleDefinition } | { ok: false; error: string }
> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Le nom du rôle doit contenir 2 à 60 caractères." };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("admin_roles")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Un rôle porte déjà ce nom." };
  }

  const { data, error } = await supabase
    .from("admin_roles")
    .insert({ name, permissions: input.permissions })
    .select("id, name, permissions, created_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Un rôle porte déjà ce nom." };
    }
    return { ok: false, error: error.message };
  }

  try {
    await recordAdminTeamAction({
      adminId: input.actorId,
      action: "CREATE_ROLE",
      targetEmail: `Rôle ${name}`,
      reason: `Création du rôle « ${name} » : ${describePermissions(input.permissions)}`,
    });
  } catch {
    // Le journal ne doit pas bloquer la création du rôle.
  }

  return { ok: true, role: toRole(data) };
}

/**
 * Assigne un rôle personnalisé (ou revient aux droits standards du rôle
 * `admin`/`dirigeant` quand `roleId` vaut `null`).
 */
export async function assignAdminRole(input: {
  adminId: string;
  roleId: string | null;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("admins")
    .select("id, email, role")
    .eq("id", input.adminId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Administrateur introuvable." };

  const standardRole = (target.role as AdminRole) ?? "admin";
  let permissions = defaultAdminPermissions(standardRole);
  let roleName = standardRole === "dirigeant" ? "Dirigeant AvisTrack" : "Administrateur";

  if (input.roleId) {
    const { data: role } = await supabase
      .from("admin_roles")
      .select("id, name, permissions")
      .eq("id", input.roleId)
      .maybeSingle();
    if (!role) return { ok: false, error: "Rôle introuvable." };
    permissions = parseAdminPermissions(role.permissions, standardRole);
    roleName = role.name;
  }

  const { error } = await supabase
    .from("admins")
    .update({ role_id: input.roleId, permissions })
    .eq("id", input.adminId);
  if (error) return { ok: false, error: error.message };

  try {
    await recordAdminTeamAction({
      adminId: input.actorId,
      action: "UPDATE_ROLE",
      targetEmail: target.email,
      reason: `Rôle attribué : ${roleName} (${describePermissions(permissions)})`,
    });
  } catch {
    // Ne bloque pas l'assignation.
  }

  return { ok: true };
}

function describePermissions(permissions: AdminPermissions): string {
  return Object.entries(permissions)
    .map(([module, level]) => `${module}=${level}`)
    .join(", ");
}
