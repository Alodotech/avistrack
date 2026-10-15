import type { Review } from "@/server/domain";

/** Un point de la série : un jour (ISO `AAAA-MM-JJ`) et le nombre d'avis reçus. */
export type TrendPoint = {
  date: string;
  count: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Série journalière des avis sur les `days` derniers jours, du plus ancien au
 * plus récent. Les jours sans avis valent zéro : la courbe reste continue.
 */
export function buildDailyTrend(
  reviews: readonly Review[],
  days: number,
  now: Date,
): TrendPoint[] {
  const start = new Date(now.getTime() - (days - 1) * DAY_MS);
  start.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const key = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const review of reviews) {
    const key = review.createdAt.toISOString().slice(0, 10);
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}
