import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/format";
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

const journalHref = (page: number) =>
  page > 1 ? `/admin/journal?page=${page}` : "/admin/journal";

/** AD-06 : qui a fait quoi, quand, sur quelle entreprise. */
export default function AuditLogPage({
  searchParams,
}: PageProps<"/admin/journal">) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Journal d&apos;audit</h1>
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

  if (entries.total === 0) {
    return (
      <p className="rounded bg-gray-100 p-5 text-sm">
        Aucune action enregistrée. Les suspensions, réactivations et
        suppressions d&apos;entreprises apparaîtront ici.
      </p>
    );
  }

  return (
    <>
      <div className="relative overflow-x-auto rounded border border-black/15">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-black text-white">
            <tr>
              {["Date", "Administrateur", "Action", "Entreprise"].map(
                (heading) => (
                  <th key={heading} scope="col" className="px-3 py-3">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.items.map((entry) => (
              <tr key={entry.id} className="border-t border-black/15">
                <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="px-3 py-3 break-all">{entry.adminEmail}</td>
                <td className="px-3 py-3">{ACTION_LABELS[entry.action]}</td>
                <td className="px-3 py-3">{entry.companyName ?? "—"}</td>
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
  );
}
