"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/auth/guards";
import {
  ADMIN_MODULES,
  ADMIN_PERMISSION_LEVELS,
  type AdminPermissions,
  type AdminRole,
} from "@/server/domain";
import {
  addAdmin,
  removeAdmin,
  updateAdminPermissions,
  updateAdminRole,
} from "@/server/repositories/admin-repository";
import {
  assignAdminRole,
  createAdminRole,
} from "@/server/repositories/admin-role-repository";

export type AdminActionResult = {
  ok: boolean;
  error?: string;
};

/**
 * Invite un nouvel utilisateur au sein de l'équipe d'administration AvisTrack.
 */
export async function inviteAdminAction(
  prevState: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const emailRaw = formData.get("email");
  const roleRaw = formData.get("role");

  if (typeof emailRaw !== "string" || !emailRaw.trim()) {
    return { ok: false, error: "Veuillez renseigner une adresse e-mail valide." };
  }

  const role: AdminRole = roleRaw === "dirigeant" ? "dirigeant" : "admin";

  const result = await addAdmin({
    email: emailRaw,
    role,
    actorId: currentAdmin.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/**
 * Modifie le rôle d'un administrateur (Administrateur <-> Dirigeant AvisTrack).
 */
export async function updateAdminRoleAction(
  adminId: string,
  newRole: AdminRole,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const result = await updateAdminRole({
    adminId,
    role: newRole,
    actorId: currentAdmin.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/** Met à jour les permissions module par module d'un membre. */
export async function updateAdminPermissionsAction(
  adminId: string,
  rawPermissions: Partial<Record<string, string>>,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const permissions = {} as AdminPermissions;
  for (const mod of ADMIN_MODULES) {
    const level = rawPermissions[mod];
    if (
      typeof level !== "string" ||
      !(ADMIN_PERMISSION_LEVELS as readonly string[]).includes(level)
    ) {
      return { ok: false, error: "Permissions invalides." };
    }
    permissions[mod] = level as AdminPermissions[typeof mod];
  }

  const result = await updateAdminPermissions({
    adminId,
    permissions,
    actorId: currentAdmin.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/** Normalise un jeu de permissions reçu du formulaire « Créer un rôle ». */
function parseRequestedPermissions(
  raw: Partial<Record<string, string>>,
): AdminPermissions | null {
  const permissions = {} as AdminPermissions;
  for (const mod of ADMIN_MODULES) {
    const level = raw[mod];
    if (
      typeof level !== "string" ||
      !(ADMIN_PERMISSION_LEVELS as readonly string[]).includes(level)
    ) {
      return null;
    }
    permissions[mod] = level as AdminPermissions[typeof mod];
  }
  return permissions;
}

/** Crée un rôle personnalisé (nom + droits par module). */
export async function createAdminRoleAction(
  name: string,
  rawPermissions: Partial<Record<string, string>>,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const permissions = parseRequestedPermissions(rawPermissions);
  if (!permissions) return { ok: false, error: "Permissions invalides." };

  const result = await createAdminRole({
    name,
    permissions,
    actorId: currentAdmin.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/** Assigne un rôle personnalisé à un membre (ou revient aux droits standards). */
export async function assignAdminRoleAction(
  adminId: string,
  roleId: string | null,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const result = await assignAdminRole({
    adminId,
    roleId,
    actorId: currentAdmin.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}

/**
 * Révocation complète des accès d'un administrateur.
 */
export async function removeAdminAction(
  adminId: string,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdminPermission("users", "manage");

  const result = await removeAdmin({
    adminId,
    actorId: currentAdmin.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/journal");
  return { ok: true };
}
