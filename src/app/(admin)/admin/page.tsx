import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KPICard } from "@/components/admin/kpi-card";
import { PlatformActivityChart } from "@/components/admin/platform-activity-chart";
import { RecentActivity } from "@/components/admin/recent-activity";
import { RecentCompanies } from "@/components/admin/recent-companies";
import { FinancialOverview } from "@/components/admin/financial-overview";
import { buttonClass } from "@/components/ui/button";
import {
  BuildingIcon,
  JournalIcon,
  MessageIcon,
  PauseIcon,
  StarIcon,
  TrendIcon,
  DownloadIcon,
} from "@/components/ui/icons";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { StatCardSkeleton } from "@/components/ui/stat-card";
import { StatGrid } from "@/components/ui/stat-card";
import { formatAverage, formatCount } from "@/lib/format";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { deltaChip } from "@/lib/kpi-delta";
import { requireAdminPermission } from "@/server/auth/guards";
import { listAuditLog } from "@/server/repositories/audit-log-repository";
import { getPlatformStats, listRecentCompanies } from "@/server/repositories/company-repository";
import { getPlatformActivity } from "@/server/repositories/platform-activity-repository";
import { getSerializedCompanySubscriptions } from "@/server/repositories/subscription-repository";

export const metadata: Metadata = { title: "Tableau de bord" };



const STAT_LABELS = {
  companies: "Entreprises inscrites",
  reviews: "Avis collectés",
  rating: "Note moyenne",
  suspended: "Comptes suspendus",
} as const;

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  // Garantit un rendu à la requête (pas de pré-rendu statique).
  // Nécessaire car Date.now() / new Date() sont utilisés dans les composants
  // fils (getPlatformStats, timeAgo…). Compatible avec nextConfig.cacheComponents.
  await connection();

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="L'activité de la plateforme AvisTrack : abonnements, finances, inscriptions et avis collectés."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}


async function DashboardContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  const admin = await requireAdminPermission("dashboard");
  // Les inscriptions « sur 30 jours » dépendent de l'heure courante.
  await connection();

  const canCompanies = hasAdminPermission(admin.permissions, "companies");
  const canFinances = hasAdminPermission(admin.permissions, "finances");
  const canAudit = hasAdminPermission(admin.permissions, "audit");

  const rawPeriod = (await searchParams).periode;
  const periodValue = Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod;
  const activityDays =
    periodValue === "semaine" || periodValue === "7"
      ? 7
      : periodValue === "annee" || periodValue === "365"
        ? 365
        : 30;

  const [stats, recentCompanies, auditLog, activity] = await Promise.all([
    getPlatformStats(),
    canCompanies ? listRecentCompanies(5) : Promise.resolve([]),
    canAudit
      ? listAuditLog({ page: 1, pageSize: 5 })
      : Promise.resolve({ items: [], total: 0 }),
    getPlatformActivity(activityDays),
  ]);

  const companyIds = recentCompanies.map((c) => c.id);
  const subscriptions = canFinances
    ? await getSerializedCompanySubscriptions(companyIds)
    : {};

  return (
    <>
      <StatGrid>
        <KPICard
          label={STAT_LABELS.companies}
          value={formatCount(stats.companyCount)}
          hint={`${formatCount(stats.newCompaniesLast7Days)} sur 7j · ${formatCount(stats.newCompaniesLast30Days)} sur 30j`}
          delta={deltaChip(
            stats.newCompaniesLast30Days,
            stats.newCompaniesPrevious30Days,
            "Inscriptions des 30 derniers jours, comparées aux 30 jours précédents",
          )}
          icon={<BuildingIcon />}
          href="/admin/entreprises"
        />
        <KPICard
          label={STAT_LABELS.reviews}
          value={formatCount(stats.reviewCount)}
          hint={`${formatCount(stats.reviewsLast30Days)} sur 30j · toutes entreprises confondues`}
          delta={deltaChip(
            stats.reviewsLast30Days,
            stats.reviewsPrevious30Days,
            "Avis publiés sur 30 jours, comparés aux 30 jours précédents",
          )}
          icon={<MessageIcon />}
          href="/admin/entreprises"
        />
        <KPICard
          label={STAT_LABELS.rating}
          value={formatAverage(stats.averageRating)}
          hint={
            stats.averageRating === null
              ? "Aucun avis publié"
              : "Note moyenne sur 5"
          }
          icon={<StarIcon filled={false} className="size-5" />}
          href="/admin/entreprises"
        />
        <KPICard
          label={STAT_LABELS.suspended}
          value={formatCount(stats.suspendedCompanyCount)}
          hint="Accès et formulaire désactivés"
          icon={<PauseIcon />}
          href="/admin/entreprises?statut=suspended"
        />
      </StatGrid>

      {(canCompanies || canAudit) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {canCompanies ? (
            <Panel
              id="recent-companies"
              title="Dernières inscriptions"
              description="Les 5 entreprises les plus récentes"
            >
              <RecentCompanies items={recentCompanies} />
            </Panel>
          ) : null}
          {canAudit ? (
            <Panel
              id="recent-activity"
              title="Activité récente"
              description="Dernières actions administratives"
            >
              <RecentActivity entries={auditLog.items} />
            </Panel>
          ) : null}
        </div>
      )}

      {canFinances ? (
        <FinancialOverview
          companies={recentCompanies}
          totalCompaniesCount={stats.companyCount}
          subscriptions={subscriptions}
        />
      ) : null}

      <Panel
        id="tendance"
        title="Activité de la plateforme"
        description={`Fenêtre glissante de ${activityDays} jours : inscriptions, abonnements et entreprises ayant reçu au moins un avis.`}
        flush
      >
        <div className="flex flex-col gap-5 p-5 lg:p-6">
          <nav aria-label="Période du graphique" className="flex flex-wrap gap-2">
            {([
              [7, "semaine", "Semaine"],
              [30, "mois", "Mois"],
              [365, "annee", "Année"],
            ] as const).map(([days, key, label]) => (
              <Link
                key={days}
                href={days === 30 ? "/admin" : `/admin?periode=${key}`}
                className={buttonClass(
                  activityDays === days ? "primary" : "secondary",
                  "min-h-9 px-3 py-1.5 text-xs",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <PlatformActivityChart activity={activity} />
        </div>
      </Panel>

      <Panel
        id="accueil"
        title="Nouvelles inscriptions"
        description={`${formatCount(stats.newCompaniesLast30Days)} entreprise${stats.newCompaniesLast30Days > 1 ? "s" : ""} inscrite${stats.newCompaniesLast30Days > 1 ? "s" : ""} sur les 30 derniers jours, contre ${formatCount(stats.newCompaniesPrevious30Days)} sur la période précédente.`}
      >
        <p className="text-sm leading-6 text-gray-600">
          Le détail des entreprises et les actions d&apos;administration sont
          accessibles selon les permissions de votre compte. Chaque action est
          consignée au journal d&apos;audit.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {canCompanies ? (
            <Link href="/admin/entreprises" className={buttonClass("secondary")}>
              <BuildingIcon />
              Liste des entreprises
            </Link>
          ) : null}
          {canAudit ? (
            <Link href="/admin/journal" className={buttonClass("ghost")}>
              <JournalIcon />
              Journal d&apos;audit
            </Link>
          ) : null}
          {hasAdminPermission(admin.permissions, "reports") ? (
            <Link href="/admin/rapports" className={buttonClass("ghost")}>
              <TrendIcon />
              Rapports
            </Link>
          ) : null}
          <Link href="/admin/rapports" className={buttonClass("secondary")}>
            <DownloadIcon />
            Rapports PDF
          </Link>
        </div>
      </Panel>

      {stats.companyCount === 0 ? (
        <EmptyState>
          La plateforme n&apos;accueille encore aucune entreprise : les
          indicateurs resteront à zéro jusqu&apos;à la première inscription.
        </EmptyState>
      ) : null}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 lg:gap-8">
      <p className="sr-only">Chargement du tableau de bord…</p>
      <StatGrid>
        {Object.values(STAT_LABELS).map((label) => (
          <StatCardSkeleton key={label} label={label} />
        ))}
      </StatGrid>
      <div className="h-96 rounded-lg border border-black/15 bg-white" />
    </div>
  );
}
