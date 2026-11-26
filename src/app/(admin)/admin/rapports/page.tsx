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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
          <form
            method="get"
            action="/admin/rapports"
            className="grid content-start gap-4 sm:grid-cols-2 2xl:grid-cols-[1fr_1.2fr_0.8fr_auto]"
          >
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Type de rapport
              <select
                id="report-period"
                name="periode"
                defaultValue={period}
                className="min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal normal-case text-black focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="month">Mensuel</option>
                <option value="year">Annuel</option>
              </select>
            </label>

            {period === "month" ? (
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                Mois
                <select
                  id="report-month"
                  name="mois"
                  defaultValue={month}
                  className="min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal normal-case text-black focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Année
              <select
                id="report-year"
                name="annee"
                defaultValue={year}
                className="min-h-11 w-full rounded-md border border-black/20 bg-white px-3 text-sm font-normal normal-case text-black focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {years.sort((a, b) => b - a).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end sm:col-span-2 2xl:col-span-1">
              <button
                type="submit"
                className={buttonClass("primary", "w-full 2xl:w-auto")}
              >
                Afficher le rapport
              </button>
            </div>
          </form>

          <div className="flex flex-col justify-center gap-3 rounded-lg border border-black/10 bg-gray-50 p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold">Télécharger le rapport</h3>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                Choisissez un format. Chaque téléchargement est ajouté à
                l&apos;historique.
              </p>
            </div>
            <PlatformReportExportButtons
              period={period}
              year={year}
              month={month}
            />
          </div>
        </div>
      </Panel>

      <section aria-labelledby="report-kpis-title" className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h2 id="report-kpis-title" className="text-lg font-semibold">
            Chiffres clés
          </h2>
          <p className="text-sm text-gray-600">
            Vue d&apos;ensemble pour {report.periodLabel.toLowerCase()}.
          </p>
        </header>
        <StatGrid>
          <StatCard label="Entreprises" value={formatCount(report.stats.companyCount)} hint="Inscrites sur la période" />
          <StatCard label="Actives" value={formatCount(report.stats.activeCount)} hint="Comptes non suspendus" />
          <StatCard label="Avis sur la période" value={formatCount(report.stats.periodReviewCount)} hint={`${formatCount(report.stats.reviewCount)} au total`} />
          <StatCard label="Note moyenne" value={formatAverage(report.stats.averageRating)} hint="Sur les entreprises du rapport" />
        </StatGrid>
      </section>

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
            <table className="w-full min-w-[1050px] table-fixed text-sm">
              <colgroup>
                <col className="w-52" />
                <col className="w-56" />
                <col className="w-32" />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-24" />
              </colgroup>
              <thead className="bg-black text-left text-xs tracking-wide text-white uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Entreprise</th>
                  <th scope="col" className="px-4 py-3">Contact</th>
                  <th scope="col" className="px-4 py-3">Statut</th>
                  <th scope="col" className="px-4 py-3">Inscription</th>
                  <th scope="col" className="px-4 py-3">Abonnement</th>
                  <th scope="col" className="px-4 py-3 text-right">Avis</th>
                  <th scope="col" className="px-4 py-3 text-right">Note</th>
                </tr>
              </thead>
              <tbody>
                {report.companies.map((company) => {
                  const status =
                    company.status === "ACTIVE"
                      ? "Active"
                      : company.status === "SUSPENDED"
                        ? "Suspendue"
                        : "En attente";
                  const subscription =
                    company.subscription === "trial"
                      ? "Essai"
                      : company.subscription === "annual"
                        ? "Pro annuel"
                        : "Pro mensuel";

                  return (
                    <tr
                      key={company.id}
                      className="border-t border-black/10 even:bg-gray-50/70 hover:bg-accent/5"
                    >
                      <td className="break-words px-4 py-3">
                        <span className="block font-semibold">{company.name}</span>
                        <span className="mt-1 block truncate font-mono text-[0.65rem] text-gray-500" title={company.publicId}>
                          {company.publicId}
                        </span>
                      </td>
                      <td className="break-words px-4 py-3 text-gray-600">
                        <span className="block">{company.email}</span>
                        <span className="mt-1 block text-xs">{company.phone || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-600">
                        {formatDate(company.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">{subscription}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCount(company.reviewCount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatAverage(company.averageRating)}
                      </td>
                    </tr>
                  );
                })}
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
          <>
            <ul className="divide-y divide-black/10 lg:hidden">
              {report.audit.slice(0, 50).map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{entry.action}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{formatDate(entry.createdAt)}</span>
                  </div>
                  <span className="break-words text-gray-600">
                    {entry.adminEmail} · {entry.companyName ?? "—"}
                  </span>
                  {entry.reason ? <span className="break-words text-xs text-gray-500">{entry.reason}</span> : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] table-fixed text-sm">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-48" />
                  <col className="w-56" />
                  <col className="w-56" />
                  <col className="w-72" />
                </colgroup>
                <thead className="bg-black text-left text-xs tracking-wide text-white uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Action</th>
                    <th scope="col" className="px-4 py-3">Administrateur</th>
                    <th scope="col" className="px-4 py-3">Entreprise</th>
                    <th scope="col" className="px-4 py-3">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {report.audit.slice(0, 50).map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-black/10 even:bg-gray-50/70 hover:bg-accent/5"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-600">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold">{entry.action}</td>
                      <td className="break-words px-4 py-3 text-gray-600">{entry.adminEmail}</td>
                      <td className="break-words px-4 py-3 font-medium">{entry.companyName ?? "—"}</td>
                      <td className="break-words px-4 py-3 text-gray-600">{entry.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-black text-left text-xs tracking-wide text-white uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Administrateur</th>
                  <th scope="col" className="px-4 py-3">Rapport</th>
                  <th scope="col" className="px-4 py-3">Format</th>
                </tr>
              </thead>
              <tbody>
                {downloads.items.map((download) => (
                  <tr
                    key={download.id}
                    className="border-t border-black/10 even:bg-gray-50/70"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {formatDate(download.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {download.adminEmail}
                    </td>
                    <td className="px-4 py-3">{download.label}</td>
                    <td className="px-4 py-3 font-mono text-xs uppercase">
                      {download.format}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
