"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/server/auth/guards";
import type { SubscriptionPeriod } from "@/server/domain";
import { setCompanySubscription } from "@/server/repositories/subscription-repository";

export async function updateSubscriptionAction(formData: FormData) {
  const admin = await requireAdminPermission("finances", "manage");

  const companyId = formData.get("companyId")?.toString();
  const companyName = formData.get("companyName")?.toString() || "Entreprise";
  const period = (formData.get("period")?.toString() as SubscriptionPeriod) || "trial";
  const notes = formData.get("notes")?.toString();

  if (!companyId) {
    return { success: false, error: "Identifiant entreprise manquant." };
  }

  try {
    await setCompanySubscription({
      adminId: admin.id,
      adminEmail: admin.email,
      companyId,
      companyName,
      period,
      notes,
    });

    revalidatePath("/admin/finances");
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    console.error("Erreur mise à jour abonnement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}
