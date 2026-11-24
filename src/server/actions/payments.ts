"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createFedapayCheckoutToken } from "@/lib/fedapay-checkout-token";
import { getSubscriptionPrice } from "@/lib/pricing";
import { requireCompany } from "@/server/auth/guards";
import {
  getFedapayEnvironment,
  getFedapaySecretKey,
} from "@/server/fedapay";
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

export type FedapayCheckoutPeriod = "monthly" | "annual";

export type FedapayCheckoutConfig = {
  publicKey: string;
  environment: "sandbox" | "live";
  period: FedapayCheckoutPeriod;
  amount: number;
  description: string;
  token: string;
  customer: {
    email: string;
    firstname: string;
    lastname: string;
  };
};

export type FedapayCheckoutActionState = {
  ok: boolean;
  config?: FedapayCheckoutConfig;
  message?: string;
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

export async function createFedapayCheckoutAction(
  period: FedapayCheckoutPeriod,
): Promise<FedapayCheckoutActionState> {
  try {
    const company = await requireCompany(BILLING_GUARD);
    if (period !== "monthly" && period !== "annual") {
      return { ok: false, message: "Formule invalide." };
    }
    const publicKey = process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY;
    if (!publicKey) {
      return { ok: false, message: "FedaPay n'est pas configuré." };
    }

    const amount = getSubscriptionPrice(period);
    const token = createFedapayCheckoutToken(
      {
        companyId: company.id,
        period,
        amount,
        nonce: randomUUID(),
        iat: Date.now(),
      },
      getFedapaySecretKey(),
    );
    const [firstname, ...rest] = company.name.trim().split(/\s+/);

    return {
      ok: true,
      config: {
        publicKey,
        environment: getFedapayEnvironment(),
        period,
        amount,
        description: `Abonnement AvisTrack — ${period === "annual" ? "Pro annuel" : "Pro mensuel"}`,
        token,
        customer: {
          email: company.email,
          firstname: firstname || company.name,
          lastname: rest.join(" ") || company.name,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de préparer le paiement.",
    };
  }
}
