"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guards";
import type { AdminRole } from "@/server/domain";
import {
  addAdmin,
  removeAdmin,
  updateAdminRole,
} from "@/server/repositories/admin-repository";

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
  const currentAdmin = await requireAdmin();

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
  const currentAdmin = await requireAdmin();

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

/**
 * Révocation complète des accès d'un administrateur.
 */
export async function removeAdminAction(
  adminId: string,
): Promise<AdminActionResult> {
  const currentAdmin = await requireAdmin();

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
