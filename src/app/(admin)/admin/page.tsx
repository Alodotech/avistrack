import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { KPICard } from "@/components/admin/kpi-card";
import { PlatformTrendChart } from "@/components/admin/platform-trend-chart";
import { RecentActivity } from "@/components/admin/recent-activity";
import { RecentCompanies } from "@/components/admin/recent-companies";
import { buttonClass } from "@/components/ui/button";
import {
  BuildingIcon,
  JournalIcon,
  MessageIcon,
  PauseIcon,
  StarIcon,
  TrendIcon,
} from "@/components/ui/icons";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { StatCardSkeleton } from "@/components/ui/stat-card";
import { StatGrid } from "@/components/ui/stat-card";
import { formatAverage, formatCount } from "@/lib/format";
import { deltaChip } from "@/lib/kpi-delta";
import { requireAdmin } from "@/server/auth/guards";
import { listAuditLog } from "@/server/repositories/audit-log-repository";
import { getPlatformStats, listRecentCompanies } from "@/server/repositories/company-repository";

export const metadata: Metadata = { title: "Tableau de bord" };

const STAT_LABELS = {
  companies: "Entreprises inscrites",
  reviews: "Avis collectés",
  rating: "Note moyenne",
  suspended: "Comptes suspendus",
} as const;

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="L'activité de la plateforme AvisTrack : inscriptions, avis collectés et comptes suspendus."
        actions={
          <Link href="/admin/entreprises" className={buttonClass("secondary")}>
            Gérer les entreprises
          </Link>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent() {
  await requireAdmin();
  // Les inscriptions « sur 30 jours » dépendent de l'heure courante.
  await connection();

  const [stats, recentCompanies, auditLog] = await Promise.all([
    getPlatformStats(),
    listRecentCompanies(5),
    listAuditLog({ page: 1, pageSize: 5 }),
  ]);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          id="recent-companies"
          title="Dernières inscriptions"
          description="Les 5 entreprises les plus récentes"
        >
          <RecentCompanies items={recentCompanies} />
        </Panel>
        <Panel
          id="recent-activity"
          title="Activité récente"
          description="Dernières actions administratives"
        >
          <RecentActivity entries={auditLog.items} />
        </Panel>
      </div>

      <Panel
        id="tendance"
        title="Évolution sur 12 mois"
        description="Inscriptions d'entreprises et avis publiés, mois par mois"
        flush
      >
        <div className="p-5 lg:p-6">
          <PlatformTrendChart
            companies={stats.companiesLast12Months}
            reviews={stats.reviewsLast12Months}
          />
        </div>
      </Panel>

      <Panel
        id="accueil"
        title="Nouvelles inscriptions"
        description={`${formatCount(stats.newCompaniesLast30Days)} entreprise${stats.newCompaniesLast30Days > 1 ? "s" : ""} inscrite${stats.newCompaniesLast30Days > 1 ? "s" : ""} sur les 30 derniers jours, contre ${formatCount(stats.newCompaniesPrevious30Days)} sur la période précédente.`}
      >
        <p className="text-sm leading-6 text-gray-600">
          Le détail des entreprises, la suspension d&apos;un compte et la
          suppression définitive se gèrent depuis la{" "}
          <Link href="/admin/entreprises" className="font-semibold text-black underline underline-offset-4">
            liste des entreprises
          </Link>
          . Chaque action d&apos;administration est consignée au{" "}
          <Link href="/admin/journal" className="font-semibold text-black underline underline-offset-4">
            journal d&apos;audit
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/entreprises" className={buttonClass("secondary")}>
            <BuildingIcon />
            Liste des entreprises
          </Link>
          <Link href="/admin/journal" className={buttonClass("ghost")}>
            <JournalIcon />
            Journal d&apos;audit
          </Link>
          <Link href="/admin/entreprises" className={buttonClass("ghost")}>
            <TrendIcon />
            Voir les tendances
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
