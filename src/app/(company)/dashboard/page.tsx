import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { SubscriptionSummary } from "@/components/billing/subscription-summary";
import { ReviewFilters } from "@/components/company/review-filters";
import { ReviewsTable } from "@/components/company/reviews-table";
import { SatisfactionOverview } from "@/components/company/satisfaction-overview";
import { TrendChart } from "@/components/company/trend-chart";
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
import { consecutiveWindows, countWithin, deltaChip } from "@/lib/kpi-delta";
import { pageCount } from "@/lib/pagination";
import {
  parseReviewQuery,
  reviewQueryToHref,
  REVIEWS_PAGE_SIZE,
} from "@/lib/review-query";
import { statsFromDistribution } from "@/lib/review-stats";
import { buildDailyTrend } from "@/lib/review-trend";
import { requireCompany } from "@/server/auth/guards";
import { defaultTrialSubscription } from "@/lib/subscription";
import { getCompanySubscription } from "@/server/repositories/subscription-repository";
import {
  getRatingDistributionForCompany,
  getReviewTimelineForCompany,
} from "@/server/repositories/review-repository";
import { listReviewsForDashboard } from "@/server/services/company-reviews";

export const metadata: Metadata = { title: "Tableau de bord" };

const STAT_LABELS = {
  average: "Note moyenne",
  total: "Avis au total",
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
        description="La satisfaction de vos clients et leurs avis récents, en un coup d'œil."
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
  const now = new Date();
  // La chronologie couvre les 30 jours de tendance et les 30 jours précédents
  // de comparaison, sans jamais charger l'historique complet des avis.
  const [distribution, reviews, timeline, storedSubscription] = await Promise.all([
    getRatingDistributionForCompany(company.id),
    listReviewsForDashboard(company, query),
    getReviewTimelineForCompany(company.id, 90, now),
    getCompanySubscription(company.id),
  ]);
  const subscription =
    storedSubscription ??
    defaultTrialSubscription(company.id, company.createdAt, now);

  const lastPage = pageCount(reviews.total, REVIEWS_PAGE_SIZE);
  if (query.page > lastPage) {
    redirect(reviewQueryToHref("/dashboard", { ...query, page: lastPage }));
  }

  const stats = statsFromDistribution(distribution);
  const trend = buildDailyTrend(timeline, 30, now);
  // Le même jeu d'avis sert à mesurer la période courante et la précédente.
  const windows = consecutiveWindows(now, 30);
  const reviewDates = timeline.map((review) => review.createdAt);
  const recentCount = countWithin(reviewDates, windows.current);
  const previousRecentCount = countWithin(reviewDates, windows.previous);
  const isFiltered = Boolean(query.rating || query.periodDays);
  const satisfied = distribution[4] + distribution[5];

  return (
    <>
      <SubscriptionSummary subscription={subscription} now={now} />

      <StatGrid>
        <StatCard
          label={STAT_LABELS.average}
          info="Moyenne des notes attribuées par vos clients, de 1 à 5, sur l'ensemble de vos avis."
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
          info="Tous les avis reçus depuis la création du compte."
          value={formatCount(stats.total)}
          hint="Depuis la création du compte"
          icon={<MessageIcon />}
        />
        <StatCard
          label={STAT_LABELS.recent}
          info="Les avis déposés au cours des 30 derniers jours."
          value={formatCount(recentCount)}
          hint="Déposés ces 30 derniers jours"
          delta={deltaChip(
            recentCount,
            previousRecentCount,
            "Avis des 30 derniers jours, comparés aux 30 jours précédents",
          )}
          icon={<TrendIcon />}
        />
        <StatCard
          label={STAT_LABELS.satisfied}
          info="Part des avis notés 4 ou 5 étoiles. Il s'agit d'une proportion d'avis, pas d'un nombre de clients."
          value={stats.total === 0 ? "—" : formatPercent(satisfied / stats.total)}
          hint="Part des avis à 4 ou 5 étoiles"
          icon={<ThumbUpIcon />}
        />
      </StatGrid>

      <SatisfactionOverview stats={stats} />

      <TrendChart points={trend} />

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
      <div className="h-72 rounded-lg border border-black/15 bg-white" />
      <div className="h-64 rounded-lg border border-black/15 bg-white" />
    </div>
  );
}
