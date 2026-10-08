import "server-only";
import {
  emptyDistribution,
  type RatingDistribution,
} from "@/lib/review-stats";
import { getStore } from "@/server/dev/memory-store";
import type { Page, Rating, Review } from "@/server/domain";

/**
 * Seul point d'accès aux avis (cahier des charges §10.2 et §12, couche 2).
 *
 * RÈGLE D'OR : chaque fonction exige un `companyId`, et l'appelant doit le
 * tenir de la session serveur — jamais d'un paramètre, d'un corps ou d'un
 * en-tête de requête. Il n'existe volontairement aucune fonction « tous les
 * avis » ni « avis par identifiant ».
 */

export type ReviewFilters = {
  rating?: Rating;
  /** Ne garde que les avis déposés à partir de cette date. */
  since?: Date;
};

function assertCompanyId(companyId: string): void {
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("companyId est obligatoire pour toute lecture d'avis.");
  }
}

export async function listReviewsForCompany(
  companyId: string,
  options: ReviewFilters & { page: number; pageSize: number },
): Promise<Page<Review>> {
  assertCompanyId(companyId);
  const { rating, since, page, pageSize } = options;

  const matching = getStore()
    .reviews.filter(
      (review) =>
        review.companyId === companyId &&
        (rating === undefined || review.rating === rating) &&
        (since === undefined || review.createdAt >= since),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const start = (page - 1) * pageSize;
  return {
    items: matching.slice(start, start + pageSize),
    total: matching.length,
  };
}

export async function getRatingDistributionForCompany(
  companyId: string,
): Promise<RatingDistribution> {
  assertCompanyId(companyId);
  const distribution = emptyDistribution();
  for (const review of getStore().reviews) {
    if (review.companyId === companyId) distribution[review.rating] += 1;
  }
  return distribution;
}

export async function countReviewsForCompanySince(
  companyId: string,
  since: Date,
): Promise<number> {
  assertCompanyId(companyId);
  return getStore().reviews.filter(
    (review) => review.companyId === companyId && review.createdAt >= since,
  ).length;
}
