"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/server/auth/guards";
import {
  cancelCompanySubscription,
  ensureTrialSubscription,
  getCompanySubscription,
} from "@/server/repositories/subscription-repository";

export type PaymentActionState = {
  ok: boolean;
  message?: string;
  status?: string;
  endDate?: string | null;
};

function refreshBilling() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/onboarding");
}

const BILLING_GUARD = { allowOnboarding: true, allowExpired: true } as const;

export async function activateTrialAction(): Promise<PaymentActionState> {
  const company = await requireCompany(BILLING_GUARD);
  const existing = await getCompanySubscription(company.id);
  if (existing && (existing.status === "ACTIVE" || existing.status === "TRIALING")) {
    return { ok: true, status: existing.status };
  }
  const trial = await ensureTrialSubscription(company.id);
  refreshBilling();
  return {
    ok: true,
    status: trial.status,
    endDate: trial.currentPeriodEnd?.toISOString() ?? null,
  };
}

export async function cancelSubscriptionAction(): Promise<PaymentActionState> {
  const company = await requireCompany(BILLING_GUARD);
  await cancelCompanySubscription(company.id);
  refreshBilling();
  return { ok: true, message: "Abonnement résilié." };
}
