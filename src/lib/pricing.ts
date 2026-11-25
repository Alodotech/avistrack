import type { SubscriptionPeriod } from "@/server/domain";

export const AVIS_TRACK_PRICING = {
  trial: 0,
  monthly: 3_500,
  annual: 35_000,
} as const;

/** Économie réalisée en choisissant l'annuel plutôt que douze mensualités. */
export const AVIS_TRACK_ANNUAL_SAVINGS =
  AVIS_TRACK_PRICING.monthly * 12 - AVIS_TRACK_PRICING.annual;

/** Équivalent mensuel lissé de l'abonnement annuel. */
export const AVIS_TRACK_ANNUAL_MONTHLY_EQUIVALENT = Math.round(
  AVIS_TRACK_PRICING.annual / 12,
);

export function getSubscriptionPrice(period: SubscriptionPeriod): number {
  if (period === "annual") return AVIS_TRACK_PRICING.annual;
  if (period === "monthly") return AVIS_TRACK_PRICING.monthly;
  return AVIS_TRACK_PRICING.trial;
}

