import type { Metadata } from "next";
import { Suspense } from "react";
import { RemarksList } from "@/components/company/remarks-list";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { Pagination } from "@/components/ui/pagination";
import { formatCount } from "@/lib/format";
import { requireCompany } from "@/server/auth/guards";
import { listRemarksForCompany } from "@/server/repositories/review-repository";

export const metadata: Metadata = { title: "Remarques" };

const REMARKS_PAGE_SIZE = 10;

function currentPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default function RemarksPage({
  searchParams,
}: PageProps<"/dashboard/remarques">) {
  return (
    <>
      <PageHeader
        title="Remarques"
        description="Les messages laissés par vos clients depuis le formulaire public."
      />
      <Suspense
        fallback={<p className="text-sm text-gray-600">Chargement des remarques…</p>}
      >
        <RemarksContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function RemarksContent({
  searchParams,
}: Pick<PageProps<"/dashboard/remarques">, "searchParams">) {
  const company = await requireCompany();
  const page = currentPage((await searchParams).page);
  const { items, total } = await listRemarksForCompany(company.id, {
    page,
    pageSize: REMARKS_PAGE_SIZE,
  });

  return (
    <Panel
      id="remarques"
      title="Boîte à remarques"
      description={
        total === 0
          ? undefined
          : `${formatCount(total)} remarque${total > 1 ? "s" : ""} reçue${total > 1 ? "s" : ""}, de la plus récente à la plus ancienne.`
      }
      flush
    >
      {total === 0 ? (
        <EmptyState>
          Aucune remarque pour le moment. Vos clients peuvent en laisser une
          depuis votre formulaire public, à côté du dépôt d&apos;avis.
        </EmptyState>
      ) : (
        <>
          <RemarksList
            remarks={items.map((remark) => ({
              id: remark.id,
              firstName: remark.firstName,
              lastName: remark.lastName,
              phone: remark.phone,
              message: remark.message,
              createdAt: remark.createdAt.toISOString(),
            }))}
          />
          <Pagination
            label="Pagination des remarques"
            page={page}
            total={total}
            pageSize={REMARKS_PAGE_SIZE}
            hrefForPage={(target) => `/dashboard/remarques?page=${target}`}
          />
        </>
      )}
    </Panel>
  );
}
