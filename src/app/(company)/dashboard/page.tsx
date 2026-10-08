import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { QrCard } from "@/components/company/qr-card";
import { RatingHistogram } from "@/components/company/rating-histogram";
import { ReviewFilters } from "@/components/company/review-filters";
import { ReviewsTable } from "@/components/company/reviews-table";
import { Pagination } from "@/components/ui/pagination";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { formatAverage, formatCount } from "@/lib/format";
import { pageCount } from "@/lib/pagination";
import {
  parseReviewQuery,
  reviewQueryToHref,
  REVIEWS_PAGE_SIZE,
} from "@/lib/review-query";
import { statsFromDistribution } from "@/lib/review-stats";
import { requireCompany } from "@/server/auth/guards";
import { getRatingDistributionForCompany } from "@/server/repositories/review-repository";
import { listReviewsForDashboard } from "@/server/services/company-reviews";
import { publicReviewUrl } from "@/server/services/qr";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DashboardContent({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  // L'identité vient de la session serveur, jamais de l'URL.
  const company = await requireCompany();
  if (company.status !== "ACTIVE") {
    return <AccountStateScreen status={company.status} />;
  }

  // Le filtre par période dépend de l'heure courante : rendu à la requête uniquement.
  await connection();
  const query = parseReviewQuery(await searchParams);
  const [distribution, reviews] = await Promise.all([
    getRatingDistributionForCompany(company.id),
    listReviewsForDashboard(company, query),
  ]);

  const lastPage = pageCount(reviews.total, REVIEWS_PAGE_SIZE);
  if (query.page > lastPage) {
    redirect(reviewQueryToHref("/dashboard", { ...query, page: lastPage }));
  }

  const stats = statsFromDistribution(distribution);
  const isFiltered = Boolean(query.rating || query.periodDays);

  return (
    <>
      <QrCard publicUrl={publicReviewUrl(company.publicId)} />

      <dl className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Note moyenne"
          value={
            <>
              {formatAverage(stats.average)}
              {stats.average !== null ? (
                <span className="text-base font-normal text-gray-600"> / 5</span>
              ) : null}
            </>
          }
          hint="Calculée sur l'ensemble de vos avis"
        />
        <StatCard label="Nombre total d'avis" value={formatCount(stats.total)} />
      </dl>

      {stats.total > 0 ? <RatingHistogram stats={stats} /> : null}

      <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="reviews-title" className="text-lg font-semibold">
            Avis reçus
          </h2>
          {stats.total > 0 ? (
            <p className="text-sm text-gray-600">
              {isFiltered
                ? `${formatCount(reviews.total)} avis correspondent aux filtres, sur ${formatCount(stats.total)}.`
                : "Du plus récent au plus ancien."}
            </p>
          ) : null}
        </div>

        {stats.total === 0 ? (
          <p className="rounded bg-gray-100 p-5 text-sm">
            Vous n&apos;avez pas encore reçu d&apos;avis. Affichez votre QR code
            en point de vente pour recueillir les premiers.
          </p>
        ) : (
          <>
            <ReviewFilters query={query} />
            {reviews.total === 0 ? (
              <p className="rounded bg-gray-100 p-5 text-sm">
                Aucun avis ne correspond à ces filtres.
              </p>
            ) : (
              <>
                <ReviewsTable reviews={reviews.items} />
                <Pagination
                  label="Pagination des avis"
                  page={query.page}
                  total={reviews.total}
                  pageSize={REVIEWS_PAGE_SIZE}
                  hrefForPage={(page) =>
                    reviewQueryToHref("/dashboard", { ...query, page })
                  }
                />
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <p className="sr-only">Chargement de vos données…</p>
      <div className="h-56 rounded border border-black/15 bg-gray-100" />
      <dl className="grid gap-4 sm:grid-cols-2">
        <StatCardSkeleton label="Note moyenne" />
        <StatCardSkeleton label="Nombre total d'avis" />
      </dl>
    </div>
  );
}
