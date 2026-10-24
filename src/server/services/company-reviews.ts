import "server-only";
import {
  periodStart,
  REVIEWS_PAGE_SIZE,
  type ReviewQuery,
} from "@/lib/review-query";
import type { Company, Page, Review } from "@/server/domain";
import { listReviewsForCompany } from "@/server/repositories/review-repository";

/**
 * Liste d'avis du dashboard et de `/api/company/reviews`.
 * Reçoit l'entreprise entière, obtenue d'une garde de session, plutôt qu'un
 * identifiant : impossible d'y brancher par mégarde une valeur de requête.
 */
export function listReviewsForDashboard(
  company: Company,
  query: ReviewQuery,
): Promise<Page<Review>> {
  return listReviewsForCompany(company.id, {
    page: query.page,
    pageSize: REVIEWS_PAGE_SIZE,
    rating: query.rating,
    since: query.periodDays
      ? periodStart(query.periodDays, new Date())
      : undefined,
  });
}
