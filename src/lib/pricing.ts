import type { SubscriptionPeriod } from "@/server/domain";

export const AVIS_TRACK_PRICING = {
  trial: 0,
  monthly: 3_500,
  annual: 30_000,
} as const;

export function getSubscriptionPrice(period: SubscriptionPeriod): number {
  if (period === "annual") return AVIS_TRACK_PRICING.annual;
  if (period === "monthly") return AVIS_TRACK_PRICING.monthly;
  return AVIS_TRACK_PRICING.trial;
}

