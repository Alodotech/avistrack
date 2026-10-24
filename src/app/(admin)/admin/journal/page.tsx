import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { tableStyles as t } from "@/components/ui/table";
import { formatCount, formatDateTime } from "@/lib/format";
import { pageCount, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import type { AuditAction } from "@/server/domain";
import { listAuditLog } from "@/server/repositories/audit-log-repository";

export const metadata: Metadata = { title: "Journal d'audit" };

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<AuditAction, string> = {
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  DELETE: "Suppression",
};

const COLUMNS = ["Date", "Administrateur", "Action", "Entreprise", "Motif"];

const journalHref = (page: number) =>
  page > 1 ? `/admin/journal?page=${page}` : "/admin/journal";

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
  await requireAdmin();

  const page = parsePage((await searchParams).page);
  const entries = await listAuditLog({ page, pageSize: PAGE_SIZE });

  const lastPage = pageCount(entries.total, PAGE_SIZE);
  if (page > lastPage) redirect(journalHref(lastPage));

  return (
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
            hrefForPage={journalHref}
          />
        </>
      )}
    </Panel>
  );
}
