import type { SubscriptionPeriod } from "@/server/domain";

export const AVIS_TRACK_PRICING = {
  trial: 0,
  monthly: 19_000,
  annual: 190_000,
} as const;

export function getSubscriptionPrice(period: SubscriptionPeriod): number {
  if (period === "annual") return AVIS_TRACK_PRICING.annual;
  if (period === "monthly") return AVIS_TRACK_PRICING.monthly;
  return AVIS_TRACK_PRICING.trial;
}
