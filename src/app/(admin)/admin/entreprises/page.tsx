import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompanyRowActions } from "@/components/admin/company-row-actions";
import { DateFilters } from "@/components/admin/date-filters";
import { ExportButtons } from "@/components/admin/export-buttons";
import { buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { tableStyles as t } from "@/components/ui/table";
import {
  companyFiltersToHref,
  describeCompanyFilters,
  parseCompanyFilters,
  resolveDateRange,
} from "@/lib/company-filters";
import { formatAverage, formatCount, formatDate } from "@/lib/format";
import { pageCount, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import { listCompaniesForAdmin } from "@/server/repositories/company-repository";

export const metadata: Metadata = { title: "Entreprises" };

const PAGE_SIZE = 10;

const COLUMNS = [
  "Entreprise",
  "Téléphone",
  "Inscrite le",
  "Statut",
  "Avis",
  "Note moyenne",
  "Actions",
];

export default function EntreprisesPage({ searchParams }: PageProps<"/admin/entreprises">) {
  return (
    <>
      <PageHeader
        title="Entreprises"
        description="Le parc d'entreprises clientes et leurs indicateurs agrégés. Le contenu des avis n'est jamais affiché ici."
        actions={
          <Link href="/admin" className={buttonClass("secondary")}>
            Voir le tableau de bord
          </Link>
        }
      />
      <Suspense fallback={<EntreprisesSkeleton />}>
        <EntreprisesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function EntreprisesContent({
  searchParams,
}: Pick<PageProps<"/admin/entreprises">, "searchParams">) {
  await requireAdmin();

  const params = await searchParams;
  const filters = parseCompanyFilters(params);
  const page = parsePage(params.page);
  const range = resolveDateRange(filters, new Date());

  const companies = await listCompaniesForAdmin({
    search: filters.search,
    status: filters.status,
    from: range.from,
    to: range.to,
    page,
    pageSize: PAGE_SIZE,
  });

  const lastPage = pageCount(companies.total, PAGE_SIZE);

  const countLabel = `${formatCount(companies.total)} ${
    companies.total > 1 ? "entreprises" : "entreprise"
  }`;

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("q", filters.search);
    if (filters.status !== "all") params.set("statut", filters.status);
    if (filters.dateMode !== "tous") params.set("periode", filters.dateMode);
    if (filters.dateMode === "plage") {
      if (filters.startDate) params.set("du", filters.startDate);
      if (filters.endDate) params.set("au", filters.endDate);
    }
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `/admin/entreprises?${suffix}` : "/admin/entreprises";
  };

  // Une page hors bornes affiche une liste vide : on renvoie vers la dernière.
  if (page > lastPage) redirect(hrefForPage(lastPage));

  return (
    <>
      <Panel
        id="filtres"
        title="Filtres"
        description={`${describeCompanyFilters(filters)}${
          filters.search ? ` · recherche « ${filters.search} »` : ""
        }`}
      >
        <DateFilters filters={filters} action="/admin/entreprises">
          <ExportButtons filters={filters} />
        </DateFilters>
        {filters.search || filters.status !== "all" || filters.dateMode !== "tous" ? (
          <p className="mt-4">
            <Link
              href={companyFiltersToHref("/admin/entreprises", {
                ...filters,
                search: "",
                status: "all",
                dateMode: "tous",
              })}
              className={buttonClass("ghost")}
            >
              Réinitialiser les filtres
            </Link>
          </p>
        ) : null}
      </Panel>

      <Panel
        id="liste"
        title="Liste des entreprises"
        description={
          filters.search || filters.status !== "all" || filters.dateMode !== "tous"
            ? `${countLabel} correspondent aux filtres.`
            : `${countLabel}, de la plus récente à la plus ancienne.`
        }
        flush
      >
        {companies.total === 0 ? (
          <EmptyState>
            {filters.search
              ? `Aucune entreprise ne correspond à « ${filters.search} ».`
              : "Aucune entreprise ne correspond aux filtres sélectionnés."}
          </EmptyState>
        ) : (
          <>
            {/* Sur téléphone, une entreprise = une carte : les sept colonnes ne
                tiennent pas et les actions resteraient hors écran. */}
            <ul className="md:hidden">
              {companies.items.map((company) => (
                <li
                  key={company.id}
                  className="flex flex-col gap-3 border-t border-black/10 px-4 py-4 first:border-t-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block font-semibold wrap-break-word">
                        {company.name}
                      </span>
                      <span className="block text-sm text-gray-600 wrap-anywhere">
                        {company.email}
                      </span>
                      {company.phone ? (
                        <span className="block text-sm text-gray-600">
                          {company.phone}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={company.status} />
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-gray-600">Avis</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCount(company.reviewCount)}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-gray-600">Note moyenne</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatAverage(company.averageRating)}
                        {company.averageRating !== null ? (
                          <span className="text-gray-600"> / 5</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-gray-600">Inscrite le</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatDate(company.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  <CompanyRowActions
                    id={company.id}
                    name={company.name}
                    status={company.status}
                  />
                </li>
              ))}
            </ul>

            <div className={`${t.wrapper} hidden md:block`}>
              <table className={t.table}>
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
                  {companies.items.map((company) => (
                    <tr key={company.id} className={t.row}>
                      <th scope="row" className={`${t.td} font-normal`}>
                        <span className="block font-semibold whitespace-nowrap">
                          {company.name}
                        </span>
                        <span className="block text-gray-600">
                          {/* Coupure autorisée après l'arobase uniquement. */}
                          {company.email.split("@")[0]}@<wbr />
                          {company.email.split("@")[1]}
                        </span>
                      </th>
                      <td className={`${t.td} whitespace-nowrap`}>
                        {company.phone || "—"}
                      </td>
                      <td className={`${t.td} whitespace-nowrap tabular-nums`}>
                        {formatDate(company.createdAt)}
                      </td>
                      <td className={`${t.td} whitespace-nowrap`}>
                        <StatusBadge status={company.status} />
                      </td>
                      <td className={`${t.td} tabular-nums`}>
                        {formatCount(company.reviewCount)}
                      </td>
                      <td className={`${t.td} whitespace-nowrap tabular-nums`}>
                        {formatAverage(company.averageRating)}
                        {company.averageRating !== null ? (
                          <span className="text-gray-600"> / 5</span>
                        ) : null}
                      </td>
                      <td className={t.td}>
                        <CompanyRowActions
                          id={company.id}
                          name={company.name}
                          status={company.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              label="Pagination des entreprises"
              page={page}
              total={companies.total}
              pageSize={PAGE_SIZE}
              hrefForPage={hrefForPage}
            />
          </>
        )}
      </Panel>
    </>
  );
}

function EntreprisesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p className="sr-only">Chargement des entreprises…</p>
      <div className="h-28 rounded-lg border border-black/15 bg-white" />
      <div className="h-96 rounded-lg border border-black/15 bg-white" />
    </div>
  );
}
