import type { NextRequest } from "next/server";
import { parseReviewQuery, REVIEWS_PAGE_SIZE } from "@/lib/review-query";
import { getCurrentCompany } from "@/server/auth/guards";
import { listReviewsForDashboard } from "@/server/services/company-reviews";

/**
 * Avis paginés de l'entreprise de la session uniquement (§10.4).
 * Seuls `page`, `note` et `periode` sont lus : tout `company_id` envoyé par le
 * client est ignoré.
 */
export async function GET(request: NextRequest) {
  const company = await getCurrentCompany();
  if (!company) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (company.status !== "ACTIVE") {
    return Response.json({ error: "Compte inactif." }, { status: 403 });
  }

  const query = parseReviewQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const { items, total } = await listReviewsForDashboard(company, query);

  return Response.json(
    {
      page: query.page,
      pageSize: REVIEWS_PAGE_SIZE,
      total,
      items: items.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        visitDate: review.visitDate,
        createdAt: review.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
