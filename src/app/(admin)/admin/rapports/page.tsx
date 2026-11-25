import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PlatformReportExportButtons } from "@/components/admin/platform-report-export-buttons";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { StatGrid, StatCard } from "@/components/ui/stat-card";
import { formatAverage, formatCount, formatDate } from "@/lib/format";
import { requireAdminPermission } from "@/server/auth/guards";
import { getPlatformReport } from "@/server/repositories/platform-report-repository";
import { listReportDownloads } from "@/server/repositories/report-download-repository";

export const metadata: Metadata = { title: "Rapports" };

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function bounded(value: string | undefined, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export default function AdminReportsPage({
  searchParams,
}: PageProps<"/admin/rapports">) {
  return (
    <>
      <PageHeader
        title="Rapports"
        description="Rapports mensuels et annuels, à la demande, avec les fiches entreprises, les KPI et le journal d'audit."
      />
      <Suspense fallback={<p className="text-sm text-gray-600">Chargement du rapport…</p>}>
        <ReportContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReportContent({
  searchParams,
}: Pick<PageProps<"/admin/rapports">, "searchParams">) {
  await requireAdminPermission("reports");
  await connection();

  const params = await searchParams;
  const now = new Date();
  const period = first(params.periode) === "year" ? "year" : "month";
  const year = bounded(
    first(params.annee),
    2000,
    2100,
    now.getUTCFullYear(),
  );
  const month = bounded(first(params.mois), 1, 12, now.getUTCMonth() + 1);
  // Une date de référence au milieu de la période : le rapport porte sur le
  // mois ou l'année choisis, pas forcément sur la période en cours.
  const reference =
    period === "month"
      ? new Date(Date.UTC(year, month - 1, 15))
      : new Date(Date.UTC(year, 6, 1));

  const [report, downloads] = await Promise.all([
    getPlatformReport(period, reference),
    listReportDownloads({ page: 1, pageSize: 20 }),
  ]);

  const years = Array.from({ length: 6 }, (_, index) => now.getUTCFullYear() - index);
  if (!years.includes(year)) years.push(year);

  return (
    <div className="flex flex-col gap-6">
      <Panel
        id="periode"
        title="Période du rapport"
        description={`${report.periodLabel} · ${formatDate(report.from)} → ${formatDate(report.to)}`}
      >
        <div className="flex flex-col gap-4">
          <form method="get" action="/admin/rapports" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="report-period"
                className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
              >
                Type
              </label>
              <select
                id="report-period"
                name="periode"
                defaultValue={period}
                className="min-h-11 rounded-md border border-black/30 bg-white px-3 text-sm"
              >
                <option value="month">Mensuel</option>
                <option value="year">Annuel</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="report-month"
                className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
              >
                Mois
              </label>
              <select
                id="report-month"
                name="mois"
                defaultValue={month}
                className="min-h-11 rounded-md border border-black/30 bg-white px-3 text-sm"
              >
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="report-year"
                className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
              >
                Année
              </label>
              <select
                id="report-year"
                name="annee"
                defaultValue={year}
                className="min-h-11 rounded-md border border-black/30 bg-white px-3 text-sm"
              >
                {years.sort((a, b) => b - a).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className={buttonClass("primary")}>
              Afficher
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
            <span className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Exporter
            </span>
            <PlatformReportExportButtons
              period={period}
              year={year}
              month={month}
            />
            <span className="ml-auto text-xs text-gray-500">
              Chaque export est journalisé dans l&apos;historique ci-dessous.
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        id="historique"
        title="Historique des téléchargements"
        description={`${formatCount(downloads.total)} export${downloads.total > 1 ? "s" : ""} enregistré${downloads.total > 1 ? "s" : ""}.`}
        flush
      >
        {downloads.items.length === 0 ? (
          <EmptyState>Aucun rapport téléchargé pour le moment.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Administrateur</th>
                  <th className="px-4 py-3">Rapport</th>
                  <th className="px-4 py-3">Format</th>
                </tr>
              </thead>
              <tbody>
                {downloads.items.map((download) => (
                  <tr key={download.id} className="border-t border-black/10">
                    <td className="px-4 py-3 tabular-nums">{formatDate(download.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{download.adminEmail}</td>
                    <td className="px-4 py-3">{download.label}</td>
                    <td className="px-4 py-3 font-mono text-xs uppercase">{download.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <StatGrid>
        <StatCard label="Entreprises" value={formatCount(report.stats.companyCount)} hint="Inscrites sur la période" />
        <StatCard label="Actives" value={formatCount(report.stats.activeCount)} hint="Comptes non suspendus" />
        <StatCard label="Avis sur la période" value={formatCount(report.stats.periodReviewCount)} hint={`${formatCount(report.stats.reviewCount)} au total`} />
        <StatCard label="Note moyenne" value={formatAverage(report.stats.averageRating)} hint="Sur les entreprises du rapport" />
      </StatGrid>

      <Panel
        id="entreprises"
        title="Fiches entreprises"
        description={`${formatCount(report.companies.length)} entreprise${report.companies.length > 1 ? "s" : ""} incluse${report.companies.length > 1 ? "s" : ""} dans le rapport.`}
        flush
      >
        {report.companies.length === 0 ? (
          <EmptyState>Aucune entreprise inscrite sur cette période.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Inscription</th>
                  <th className="px-4 py-3">Abonnement</th>
                  <th className="px-4 py-3">Avis</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {report.companies.map((company) => (
                  <tr key={company.id} className="border-t border-black/10">
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{company.name}</span>
                      <span className="block font-mono text-[0.65rem] text-gray-500">{company.publicId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="block">{company.email}</span>
                      <span className="block text-xs">{company.phone || "—"}</span>
                    </td>
                    <td className="px-4 py-3">{company.status}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(company.createdAt)}</td>
                    <td className="px-4 py-3">{company.subscription}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(company.reviewCount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatAverage(company.averageRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        id="audit"
        title="Journal d'audit de la période"
        description={`${formatCount(report.audit.length)} action${report.audit.length > 1 ? "s" : ""} enregistrée${report.audit.length > 1 ? "s" : ""}.`}
        flush
      >
        {report.audit.length === 0 ? (
          <EmptyState>Aucune action administrative sur cette période.</EmptyState>
        ) : (
          <ul className="divide-y divide-black/10">
            {report.audit.slice(0, 50).map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{entry.action}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{formatDate(entry.createdAt)}</span>
                </div>
                <span className="text-gray-600">
                  {entry.adminEmail} · {entry.companyName ?? "—"}
                </span>
                {entry.reason ? <span className="text-xs text-gray-500">{entry.reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
