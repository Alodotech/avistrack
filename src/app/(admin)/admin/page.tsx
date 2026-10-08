import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompanyRowActions } from "@/components/admin/company-row-actions";
import { Button, buttonClass } from "@/components/ui/button";
import {
  BuildingIcon,
  MessageIcon,
  PauseIcon,
  SearchIcon,
  TrendIcon,
} from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import {
  StatCard,
  StatCardSkeleton,
  StatGrid,
} from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { tableStyles as t } from "@/components/ui/table";
import { formatAverage, formatCount, formatDate } from "@/lib/format";
import { firstValue, pageCount, parsePage } from "@/lib/pagination";
import { requireAdmin } from "@/server/auth/guards";
import {
  getPlatformStats,
  listCompaniesForAdmin,
} from "@/server/repositories/company-repository";

export const metadata: Metadata = { title: "Administration" };

const PAGE_SIZE = 10;
const SEARCH_MAX_LENGTH = 100;

const STAT_LABELS = {
  companies: "Entreprises inscrites",
  reviews: "Avis collectés",
  recent: "Nouvelles inscriptions",
  suspended: "Comptes suspendus",
} as const;

const COLUMNS = [
  "Entreprise",
  "Inscrite le",
  "Statut",
  "Avis",
  "Note moyenne",
  "Actions",
];

function adminHref(search: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <PageHeader
        title="Entreprises"
        description="Le parc d'entreprises clientes et leurs indicateurs agrégés. Le contenu des avis n'est jamais affiché ici."
      />
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AdminContent({
  searchParams,
}: Pick<PageProps<"/admin">, "searchParams">) {
  await requireAdmin();
  // Les inscriptions « sur 30 jours » dépendent de l'heure courante.
  await connection();

  const params = await searchParams;
  const search = (firstValue(params.q) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const page = parsePage(params.page);

  const [stats, companies] = await Promise.all([
    getPlatformStats(),
    listCompaniesForAdmin({ search, page, pageSize: PAGE_SIZE }),
  ]);

  const lastPage = pageCount(companies.total, PAGE_SIZE);
  if (page > lastPage) redirect(adminHref(search, lastPage));

  const countLabel = `${formatCount(companies.total)} ${
    companies.total > 1 ? "entreprises" : "entreprise"
  }`;

  return (
    <>
      <StatGrid>
        <StatCard
          label={STAT_LABELS.companies}
          value={formatCount(stats.companyCount)}
          hint="Comptes non supprimés"
          icon={<BuildingIcon />}
        />
        <StatCard
          label={STAT_LABELS.reviews}
          value={formatCount(stats.reviewCount)}
          hint="Toutes entreprises confondues"
          icon={<MessageIcon />}
        />
        <StatCard
          label={STAT_LABELS.recent}
          value={formatCount(stats.newCompaniesLast30Days)}
          hint="Sur les 30 derniers jours"
          icon={<TrendIcon />}
        />
        <StatCard
          label={STAT_LABELS.suspended}
          value={formatCount(stats.suspendedCompanyCount)}
          hint="Accès et formulaire désactivés"
          icon={<PauseIcon />}
        />
      </StatGrid>

      <Panel
        id="entreprises"
        title="Liste des entreprises"
        description={
          search
            ? `${countLabel} pour « ${search} ».`
            : `${countLabel}, de la plus récente à la plus ancienne.`
        }
        actions={
          <form
            method="get"
            action="/admin"
            role="search"
            className="flex flex-1 flex-wrap items-end gap-3 sm:flex-none"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:w-80 sm:flex-none">
              <label
                htmlFor="company-search"
                className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
              >
                Rechercher par nom ou e-mail
              </label>
              <input
                id="company-search"
                type="search"
                name="q"
                defaultValue={search}
                maxLength={SEARCH_MAX_LENGTH}
                className="min-h-11 w-full rounded-md border border-black/30 px-3 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary">
              <SearchIcon />
              Rechercher
            </Button>
            {search ? (
              <Link href="/admin" className={buttonClass("ghost")}>
                Réinitialiser
              </Link>
            ) : null}
          </form>
        }
        flush
      >
        {companies.total === 0 ? (
          <EmptyState>
            {search
              ? `Aucune entreprise ne correspond à « ${search} ».`
              : "Aucune entreprise inscrite pour le moment."}
          </EmptyState>
        ) : (
          <>
            <div className={t.wrapper}>
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
              hrefForPage={(target) => adminHref(search, target)}
            />
          </>
        )}
      </Panel>
    </>
  );
}

function AdminSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 lg:gap-8">
      <p className="sr-only">Chargement des entreprises…</p>
      <StatGrid>
        {Object.values(STAT_LABELS).map((label) => (
          <StatCardSkeleton key={label} label={label} />
        ))}
      </StatGrid>
      <div className="h-96 rounded-lg border border-black/15 bg-white" />
    </div>
  );
}
