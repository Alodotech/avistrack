import "server-only";

export const FEEXPAY_PROVIDER = "feexpay";

export type FeexPayEnvironment = "sandbox" | "live";

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} manquante.`);
  return value;
}

export function getFeexPayApiKey(): string {
  return getRequiredEnvironmentValue("FEEXPAY_API_KEY");
}

export function getFeexPayEnvironment(): FeexPayEnvironment {
  const environment = getRequiredEnvironmentValue("FEEXPAY_ENVIRONMENT");
  if (environment !== "sandbox" && environment !== "live") {
    throw new Error("FEEXPAY_ENVIRONMENT doit valoir sandbox ou live.");
  }
  return environment;
}

export function getFeexPayApiUrl(): string {
  return getFeexPayEnvironment() === "sandbox"
    ? "https://sandbox-api.feexpay.me"
    : "https://api-v2.feexpay.me";
}

export function getFeexPayShopId(): string {
  return getRequiredEnvironmentValue("FEEXPAY_SHOP_ID");
}

export function getFeexPayWebhookSecret(): string {
  return getRequiredEnvironmentValue("FEEXPAY_WEBHOOK_SECRET");
}
