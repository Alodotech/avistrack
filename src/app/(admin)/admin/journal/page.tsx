import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { tableStyles as t } from "@/components/ui/table";
import { formatCount, formatDateTime } from "@/lib/format";
import { pageCount, parsePage } from "@/lib/pagination";
import { requireAdminPermission } from "@/server/auth/guards";
import type { AuditAction } from "@/server/domain";
import { listAuditLog } from "@/server/repositories/audit-log-repository";

export const metadata: Metadata = { title: "Journal d'audit" };

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<AuditAction, string> = {
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  DELETE: "Suppression",
  INVITE_ADMIN: "Ajout utilisateur",
  UPDATE_ADMIN_ROLE: "Changement rôle",
  REMOVE_ADMIN: "Retrait utilisateur",
  UPDATE_SUBSCRIPTION: "Mise à jour abonnement",
  DOWNLOAD_REPORT: "Téléchargement rapport",
  PAYMENT: "Paiement",
  CREATE_ROLE: "Création rôle",
  UPDATE_ROLE: "Mise à jour rôle",
};

const COLUMNS = ["Date", "Administrateur", "Action", "Entreprise", "Motif"];

type JournalFilters = {
  q: string;
  action: string;
  periode: string;
};

const PERIODS = [
  ["semaine", "7 derniers jours", 7],
  ["mois", "30 derniers jours", 30],
  ["annee", "12 derniers mois", 365],
  ["tout", "Tout l'historique", 0],
] as const;

function readParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function journalHref(filters: JournalFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.action) params.set("action", filters.action);
  if (filters.periode && filters.periode !== "tout") params.set("periode", filters.periode);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/journal?${query}` : "/admin/journal";
}

function exportHref(filters: JournalFilters, format: "csv" | "pdf"): string {
  const params = new URLSearchParams({ format });
  if (filters.q) params.set("q", filters.q);
  if (filters.action) params.set("action", filters.action);
  if (filters.periode) params.set("periode", filters.periode);
  return `/api/admin/journal/export?${params.toString()}`;
}

/** AD-06 : qui a fait quoi, quand, sur quelle entreprise. */
export default function AuditLogPage({
  searchParams,
}: PageProps<"/admin/journal">) {
  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Trace des actions d'administration : qui a fait quoi, quand, sur quelle entreprise."
      />
      <Suspense
        fallback={<p className="text-sm text-gray-600">Chargement du journal…</p>}
      >
        <AuditLogContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AuditLogContent({
  searchParams,
}: Pick<PageProps<"/admin/journal">, "searchParams">) {
  await requireAdminPermission("audit");

  const params = await searchParams;
  const page = parsePage(params.page);
  const filters: JournalFilters = {
    q: readParam(params.q),
    action: readParam(params.action),
    periode: readParam(params.periode) || "tout",
  };
  const action = (Object.keys(ACTION_LABELS) as AuditAction[]).find(
    (value) => value === filters.action,
  );
  const days = PERIODS.find(([key]) => key === filters.periode)?.[2] ?? 0;

  const entries = await listAuditLog({
    page,
    pageSize: PAGE_SIZE,
    action,
    query: filters.q || undefined,
    periodDays: days || undefined,
  });

  const lastPage = pageCount(entries.total, PAGE_SIZE);
  if (page > lastPage) redirect(journalHref(filters, lastPage));

  return (
    <>
    <Panel
      id="filtres"
      title="Filtrer le journal"
      description="Recherchez par entreprise ou administrateur, par action et par période."
    >
      <form method="get" className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
          Entreprise ou administrateur
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Nom ou e-mail"
            className="min-h-10 rounded-md border border-black/25 bg-white px-3 text-sm font-normal focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Action
          <select
            name="action"
            defaultValue={action ?? ""}
            className="min-h-10 rounded-md border border-black/25 bg-white px-3 text-sm font-normal focus:border-accent focus:outline-none"
          >
            <option value="">Toutes les actions</option>
            {(Object.keys(ACTION_LABELS) as AuditAction[]).map((value) => (
              <option key={value} value={value}>
                {ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Période
          <select
            name="periode"
            defaultValue={filters.periode}
            className="min-h-10 rounded-md border border-black/25 bg-white px-3 text-sm font-normal focus:border-accent focus:outline-none"
          >
            {PERIODS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="min-h-10 rounded-md bg-black px-4 text-sm font-semibold text-white">
            Filtrer
          </button>
          <a href="/admin/journal" className="min-h-10 rounded-md border border-black/25 px-4 py-2.5 text-sm font-semibold">
            Réinitialiser
          </a>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={exportHref(filters, "csv")} className="text-sm font-semibold underline underline-offset-4">
          Exporter en CSV
        </a>
        <a href={exportHref(filters, "pdf")} className="text-sm font-semibold underline underline-offset-4">
          Exporter en PDF
        </a>
      </div>
    </Panel>

    <Panel
      id="journal"
      title="Actions enregistrées"
      description={
        entries.total === 0
          ? undefined
          : `${formatCount(entries.total)} ${entries.total > 1 ? "actions" : "action"}, de la plus récente à la plus ancienne.`
      }
      flush
    >
      {entries.total === 0 ? (
        <EmptyState>
          Aucune action enregistrée. Les suspensions, réactivations et
          suppressions d&apos;entreprises apparaîtront ici.
        </EmptyState>
      ) : (
        <>
          <ul className="md:hidden">
            {entries.items.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 border-t border-black/10 px-4 py-4 first:border-t-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {ACTION_LABELS[entry.action]}
                  </span>
                  <span className="text-xs text-gray-600 tabular-nums">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="wrap-break-word text-sm">
                  {entry.companyName ?? "—"}
                </p>
                <p className="wrap-anywhere text-xs text-gray-600">
                  {entry.adminEmail}
                </p>
                {entry.reason ? (
                  <p className="text-sm text-gray-600 italic">
                    « {entry.reason} »
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className={`${t.wrapper} hidden md:block`}>
            <table className={`${t.table} min-w-176`}>
              <thead className={t.head}>
                <tr>
                  {COLUMNS.map((heading) => (
                    <th key={heading} scope="col" className={t.th}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.items.map((entry) => (
                  <tr key={entry.id} className={t.row}>
                    <td className={`${t.td} whitespace-nowrap tabular-nums`}>
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className={`${t.td} whitespace-nowrap`}>{entry.adminEmail}</td>
                    <td className={`${t.td} font-semibold`}>
                      {ACTION_LABELS[entry.action]}
                    </td>
                    <td className={`${t.td} w-full`}>
                      {entry.companyName ?? "—"}
                    </td>
                    <td className={`${t.td} max-w-80 text-gray-600`}>
                      {entry.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="Pagination du journal"
            page={page}
            total={entries.total}
            pageSize={PAGE_SIZE}
            hrefForPage={(target) => journalHref(filters, target)}
          />
        </>
      )}
    </Panel>
    </>
  );
}
