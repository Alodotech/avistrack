import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FinancialOverview } from "@/components/admin/financial-overview";
import { buttonClass } from "@/components/ui/button";
import { BuildingIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";
import { requireAdmin } from "@/server/auth/guards";
import { getPlatformStats, listRecentCompanies } from "@/server/repositories/company-repository";
import { getSerializedCompanySubscriptions } from "@/server/repositories/subscription-repository";

export const metadata: Metadata = {
  title: "Finances & Abonnements",
  robots: { index: false },
};

export default function AdminFinancesPage() {
  return (
    <>
      <PageHeader
        title="Finances & Abonnements"
        description="Surveillance du chiffre d'affaires, des encaissements récurrents et des souscriptions des entreprises clientes."
        actions={
          <Link href="/admin/entreprises" className={buttonClass("secondary")}>
            <BuildingIcon />
            Voir les entreprises
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-sm text-gray-500">
            Chargement des données financières…
          </div>
        }
      >
        <FinancesContent />
      </Suspense>
    </>
  );
}

async function FinancesContent() {
  await requireAdmin();
  await connection();

  const [stats, companies] = await Promise.all([
    getPlatformStats(),
    listRecentCompanies(50),
  ]);

  const companyIds = companies.map((c) => c.id);
  const subscriptions = await getSerializedCompanySubscriptions(companyIds);

  return (
    <FinancialOverview
      companies={companies}
      totalCompaniesCount={stats.companyCount}
      subscriptions={subscriptions}
    />
  );
}
