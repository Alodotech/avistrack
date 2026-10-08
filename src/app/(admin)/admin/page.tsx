import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompanyRowActions } from "@/components/admin/company-row-actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
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
      <h1 className="text-2xl font-semibold">Entreprises</h1>
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const STAT_LABELS = {
  companies: "Entreprises inscrites",
  reviews: "Avis collectés",
  recent: "Nouvelles inscriptions",
} as const;

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

  return (
    <>
      <dl className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={STAT_LABELS.companies}
          value={formatCount(stats.companyCount)}
        />
        <StatCard
          label={STAT_LABELS.reviews}
          value={formatCount(stats.reviewCount)}
          hint="Toutes entreprises confondues"
        />
        <StatCard
          label={STAT_LABELS.recent}
          value={formatCount(stats.newCompaniesLast30Days)}
          hint="Sur les 30 derniers jours"
        />
      </dl>

      <section aria-labelledby="companies-title" className="flex flex-col gap-4">
        <h2 id="companies-title" className="sr-only">
          Liste des entreprises
        </h2>

        <form
          method="get"
          action="/admin"
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-sm">
            <label htmlFor="company-search" className="text-sm font-semibold">
              Rechercher par nom ou e-mail
            </label>
            <input
              id="company-search"
              type="search"
              name="q"
              defaultValue={search}
              maxLength={SEARCH_MAX_LENGTH}
              className="min-h-11 rounded border border-black/30 px-3 text-sm"
            />
          </div>
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
          {search ? (
            <Link href="/admin" className={buttonClass("ghost")}>
              Réinitialiser
            </Link>
          ) : null}
        </form>

        {companies.total === 0 ? (
          <p className="rounded bg-gray-100 p-5 text-sm">
            {search
              ? `Aucune entreprise ne correspond à « ${search} ».`
              : "Aucune entreprise inscrite pour le moment."}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {formatCount(companies.total)}{" "}
              {companies.total > 1 ? "entreprises" : "entreprise"}
              {search ? ` pour « ${search} »` : ""}, de la plus récente à la
              plus ancienne.
            </p>
            <div className="relative overflow-x-auto rounded border border-black/15">
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead className="bg-black text-white">
                  <tr>
                    {[
                      "Entreprise",
                      "Inscrite le",
                      "Statut",
                      "Avis",
                      "Note moyenne",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.items.map((company) => (
                    <tr key={company.id} className="border-t border-black/15">
                      <th scope="row" className="px-3 py-3 font-normal">
                        <span className="block font-semibold">
                          {company.name}
                        </span>
                        <span className="block break-all text-gray-600">
                          {company.email}
                        </span>
                      </th>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        {formatDate(company.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={company.status} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatCount(company.reviewCount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatAverage(company.averageRating)}
                      </td>
                      <td className="px-3 py-2">
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
      </section>
    </>
  );
}

function AdminSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Chargement des entreprises…</p>
      <dl className="grid gap-4 sm:grid-cols-3">
        <StatCardSkeleton label={STAT_LABELS.companies} />
        <StatCardSkeleton label={STAT_LABELS.reviews} />
        <StatCardSkeleton label={STAT_LABELS.recent} />
      </dl>
    </div>
  );
}
