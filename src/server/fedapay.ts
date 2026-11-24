import "server-only";
import { FedaPay, Webhook } from "fedapay";
import {
  verifyFedapayCheckoutToken,
  type FedapayCheckoutPayload,
} from "@/lib/fedapay-checkout-token";

export const FEDAPAY_PROVIDER = "fedapay";

export type FedapayEnvironment = "sandbox" | "live";

export function getFedapayEnvironment(): FedapayEnvironment {
  return process.env.NEXT_PUBLIC_FEDAPAY_ENVIRONMENT === "sandbox"
    ? "sandbox"
    : "live";
}

export function getFedapaySecretKey(): string {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) throw new Error("FEDAPAY_SECRET_KEY manquante.");
  return key;
}

export function configureFedapay(): void {
  FedaPay.setApiKey(getFedapaySecretKey());
  FedaPay.setEnvironment(getFedapayEnvironment());
}

export function verifyFedapayWebhook(
  payload: string,
  signature: string,
): unknown {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("FEDAPAY_WEBHOOK_SECRET manquante.");
  return Webhook.constructEvent(payload, signature, secret) as unknown;
}

export function readFedapayCheckoutPayload(
  metadata: Record<string, unknown>,
): FedapayCheckoutPayload | null {
  return verifyFedapayCheckoutToken(
    metadata.avistrackToken,
    getFedapaySecretKey(),
  );
}
