import type { Rating } from "@/server/domain";

export const RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly Rating[];

/** Nombre d'avis par note. */
export type RatingDistribution = Record<Rating, number>;

export type ReviewStats = {
  total: number;
  /** Arrondie à une décimale (RG-06) ; `null` tant qu'aucun avis n'existe. */
  average: number | null;
  distribution: RatingDistribution;
};

export function emptyDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function statsFromDistribution(
  distribution: RatingDistribution,
): ReviewStats {
  let total = 0;
  let sum = 0;
  for (const rating of RATINGS) {
    total += distribution[rating];
    sum += rating * distribution[rating];
  }
  return {
    total,
    average: total === 0 ? null : Math.round((sum / total) * 10) / 10,
    distribution,
  };
}
