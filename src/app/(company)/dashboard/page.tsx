import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { QrCard } from "@/components/company/qr-card";
import { RatingHistogram } from "@/components/company/rating-histogram";
import { ReviewFilters } from "@/components/company/review-filters";
import { ReviewsTable } from "@/components/company/reviews-table";
import {
  MessageIcon,
  StarIcon,
  ThumbUpIcon,
  TrendIcon,
} from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import {
  StatCard,
  StatCardSkeleton,
  StatGrid,
} from "@/components/ui/stat-card";
import { formatAverage, formatCount, formatPercent } from "@/lib/format";
import { pageCount } from "@/lib/pagination";
import {
  parseReviewQuery,
  periodStart,
  reviewQueryToHref,
  REVIEWS_PAGE_SIZE,
} from "@/lib/review-query";
import { statsFromDistribution } from "@/lib/review-stats";
import { requireCompany } from "@/server/auth/guards";
import {
  countReviewsForCompanySince,
  getRatingDistributionForCompany,
} from "@/server/repositories/review-repository";
import { listReviewsForDashboard } from "@/server/services/company-reviews";
import { publicReviewUrl } from "@/server/services/qr";

export const metadata: Metadata = { title: "Tableau de bord" };

const STAT_LABELS = {
  average: "Note moyenne",
  total: "Avis reçus",
  recent: "Avis sur 30 jours",
  satisfied: "Clients satisfaits",
} as const;

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Votre QR code, la satisfaction de vos clients et leurs avis."
      />
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

  // Les indicateurs par période dépendent de l'heure courante : rendu à la requête uniquement.
  await connection();
  const query = parseReviewQuery(await searchParams);
  const [distribution, reviews, recentCount] = await Promise.all([
    getRatingDistributionForCompany(company.id),
    listReviewsForDashboard(company, query),
    countReviewsForCompanySince(company.id, periodStart(30, new Date())),
  ]);

  const lastPage = pageCount(reviews.total, REVIEWS_PAGE_SIZE);
  if (query.page > lastPage) {
    redirect(reviewQueryToHref("/dashboard", { ...query, page: lastPage }));
  }

  const stats = statsFromDistribution(distribution);
  const isFiltered = Boolean(query.rating || query.periodDays);
  const satisfied = distribution[4] + distribution[5];

  return (
    <>
      <StatGrid>
        <StatCard
          label={STAT_LABELS.average}
          value={
            <>
              {formatAverage(stats.average)}
              {stats.average !== null ? (
                <span className="text-lg font-normal text-gray-600"> / 5</span>
              ) : null}
            </>
          }
          hint="Sur l'ensemble de vos avis"
          icon={<StarIcon filled={false} className="size-5" />}
        />
        <StatCard
          label={STAT_LABELS.total}
          value={formatCount(stats.total)}
          hint="Depuis la création du compte"
          icon={<MessageIcon />}
        />
        <StatCard
          label={STAT_LABELS.recent}
          value={formatCount(recentCount)}
          hint="Déposés ces 30 derniers jours"
          icon={<TrendIcon />}
        />
        <StatCard
          label={STAT_LABELS.satisfied}
          value={stats.total === 0 ? "—" : formatPercent(satisfied / stats.total)}
          hint="Part des avis à 4 ou 5 étoiles"
          icon={<ThumbUpIcon />}
        />
      </StatGrid>

      <div className="grid gap-6 lg:gap-8 xl:grid-cols-2">
        <QrCard publicUrl={publicReviewUrl(company.publicId)} />
        <RatingHistogram stats={stats} />
      </div>

      <Panel
        id="avis"
        title="Avis reçus"
        description={
          stats.total === 0
            ? undefined
            : isFiltered
              ? `${formatCount(reviews.total)} avis correspondent aux filtres, sur ${formatCount(stats.total)}.`
              : `${formatCount(stats.total)} avis, du plus récent au plus ancien.`
        }
        actions={stats.total > 0 ? <ReviewFilters query={query} /> : undefined}
        flush
      >
        {stats.total === 0 ? (
          <EmptyState>
            Vous n&apos;avez pas encore reçu d&apos;avis. Affichez votre QR code
            en point de vente pour recueillir les premiers.
          </EmptyState>
        ) : reviews.total === 0 ? (
          <EmptyState>Aucun avis ne correspond à ces filtres.</EmptyState>
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
      </Panel>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 lg:gap-8">
      <p className="sr-only">Chargement de vos données…</p>
      <StatGrid>
        {Object.values(STAT_LABELS).map((label) => (
          <StatCardSkeleton key={label} label={label} />
        ))}
      </StatGrid>
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-2">
        <div className="h-72 rounded-lg border border-black/15 bg-white" />
        <div className="h-72 rounded-lg border border-black/15 bg-white" />
      </div>
    </div>
  );
}
