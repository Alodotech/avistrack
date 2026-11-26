"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getFeexPayCountry,
  isFeexPayOperator,
  isFeexPayCountry,
  normalizeFeexPayPhoneNumber,
  type FeexPayOperator,
  type FeexPayPaymentMethod,
} from "@/lib/feexpay";
import { getSubscriptionPrice } from "@/lib/pricing";
import { requireCompany } from "@/server/auth/guards";
import {
  getFeexPayApiUrl,
  getFeexPayApiKey,
  getFeexPayShopId,
} from "@/server/feexpay";
import {
  cancelCompanySubscription,
  createPendingFeexPayPayment,
  activatePaidSubscription,
} from "@/server/repositories/subscription-repository";
import { isLocalPaymentSimulationEnabled } from "@/lib/payment-simulation";

export type PaymentActionState = {
  ok: boolean;
  message?: string;
  status?: string;
  endDate?: string | null;
};

export type FeexPayCheckoutActionState = {
  ok: boolean;
  checkoutUrl?: string;
  notice?: string;
  message?: string;
};

function refreshBilling() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/onboarding");
}

const BILLING_GUARD = { allowOnboarding: true, allowExpired: true } as const;

export async function simulateLocalPaymentAction(
  period: "monthly" | "annual",
): Promise<PaymentActionState> {
  if (!isLocalPaymentSimulationEnabled()) {
    return { ok: false, message: "La simulation de paiement n'est pas disponible." };
  }

  try {
    const company = await requireCompany(BILLING_GUARD);
    if (period !== "monthly" && period !== "annual") {
      return { ok: false, message: "Formule invalide." };
    }

    await activatePaidSubscription({
      companyId: company.id,
      plan: "pro",
      period,
      amount: getSubscriptionPrice(period),
      provider: "local-simulation",
      providerRef: `local-${randomUUID()}`,
      actorEmail: "local-simulation",
    });
    refreshBilling();
    return {
      ok: true,
      message: "Paiement simulé confirmé. Votre tableau de bord est activé.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de simuler le paiement.",
    };
  }
}

export async function cancelSubscriptionAction(): Promise<PaymentActionState> {
  const company = await requireCompany(BILLING_GUARD);
  await cancelCompanySubscription(company.id);
  refreshBilling();
  return { ok: true, message: "Abonnement résilié." };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getFeexPayCheckoutUrl(value: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de paiement FeexPay invalide.");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".feexpay.me")
  ) {
    throw new Error("URL de paiement FeexPay invalide.");
  }
  return url.toString();
}

export async function createFeexPayCheckoutAction(
  period: "monthly" | "annual",
  method: FeexPayPaymentMethod,
  phone: string,
  operator?: FeexPayOperator,
  address?: {
    city: string;
    zip: string;
    firstName: string;
    lastName: string;
  },
): Promise<FeexPayCheckoutActionState> {
  try {
    const company = await requireCompany(BILLING_GUARD);
    if (period !== "monthly" && period !== "annual") {
      return { ok: false, message: "Formule invalide." };
    }
    if (method !== "mobile_money" && method !== "card") {
      return { ok: false, message: "Moyen de paiement invalide." };
    }
    if (!isFeexPayCountry(company.countryCode)) {
      return {
        ok: false,
        message: "Le pays de l'entreprise n'est pas pris en charge par FeexPay.",
      };
    }
    if (
      method === "mobile_money" &&
      !isFeexPayOperator(company.countryCode, operator)
    ) {
      return { ok: false, message: "Opérateur Mobile Money invalide." };
    }
    if (
      method === "card" &&
      (!address ||
        !address.city.trim() ||
        !address.zip.trim() ||
        !address.firstName.trim() ||
        !address.lastName.trim())
    ) {
      return {
        ok: false,
        message:
          "Les informations du titulaire de la carte, la ville et le code postal sont requis.",
      };
    }

    const amount = getSubscriptionPrice(period);
    const phoneNumber = normalizeFeexPayPhoneNumber(phone, company.countryCode);
    if (!phoneNumber) {
      const country = getFeexPayCountry(company.countryCode);
      throw new Error(
        country
          ? `Saisissez un numéro valide avec l'indicatif +${country.callingCode}.`
          : "Le pays de l'entreprise n'est pas pris en charge.",
      );
    }
    const apiKey = getFeexPayApiKey();
    const shop = getFeexPayShopId();
    const endpoint =
      method === "card"
        ? "/api/transactions/public/requesttopay/init"
        : `/api/transactions/public/requesttopay/${operator}`;
    const description = `Abonnement AvisTrack — ${period === "annual" ? "Pro annuel" : "Pro mensuel"}`;
    const apiUrl = getFeexPayApiUrl();
    const cardPayload =
      method === "card"
        ? {
            currency: "XOF",
            first_name: address?.firstName.trim(),
            last_name: address?.lastName.trim(),
            email: company.email,
            city: address?.city.trim(),
            zip: address?.zip.trim(),
            country: company.countryCode,
            callback_info: randomUUID(),
          }
        : {};
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shop,
        amount: method === "card" ? String(amount) : amount,
        phoneNumber: method === "card" ? phoneNumber : Number(phoneNumber),
        ...(method === "card" ? cardPayload : {}),
        ...(method === "mobile_money"
          ? {
              callback_info: randomUUID(),
            }
          : {}),
        description,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new Error("Réponse FeexPay invalide.");
    }
    const data = asRecord(responseBody);
    if (!response.ok) {
      const providerMessage =
        asString(data?.message) ?? asString(data?.error);
      throw new Error(
        providerMessage
          ? `FeexPay : ${providerMessage}`
          : `FeexPay a refusé la demande (HTTP ${response.status}).`,
      );
    }

    const providerRef = asString(data?.reference);
    if (!providerRef) {
      throw new Error("Référence de transaction FeexPay manquante.");
    }
    const checkoutUrl = getFeexPayCheckoutUrl(
      asString(data?.paymentUrl) ?? asString(data?.payment_url),
    );
    if (method === "card" && !checkoutUrl) {
      throw new Error("Lien de paiement FeexPay manquant.");
    }

    await createPendingFeexPayPayment({
      companyId: company.id,
      period,
      amount,
      providerRef,
    });

    return {
      ok: true,
      checkoutUrl: checkoutUrl ?? undefined,
      notice:
        method === "mobile_money"
          ? "Demande envoyée. Confirmez le paiement sur votre téléphone ; l'abonnement sera activé après confirmation FeexPay."
          : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de préparer le paiement FeexPay.",
    };
  }
}
