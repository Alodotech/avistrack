"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/server/auth/guards";
import { deleteRemark } from "@/server/repositories/review-repository";

export type RemarkActionResult = { ok: boolean; message?: string };

/**
 * Suppression d'une remarque reçue par l'entreprise connectée.
 * L'identifiant de l'entreprise vient de la session, jamais du client.
 */
export async function deleteRemarkAction(
  remarkId: string,
): Promise<RemarkActionResult> {
  const company = await requireCompany();
  const deleted = await deleteRemark(company.id, remarkId);
  if (!deleted) {
    return { ok: false, message: "Cette remarque est introuvable." };
  }
  revalidatePath("/dashboard/remarques");
  return { ok: true };
}
