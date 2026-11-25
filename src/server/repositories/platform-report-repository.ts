import "server-only";
import type { SubscriptionPeriod } from "@/server/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { listAuditLog, type AuditLogRowView } from "./audit-log-repository";
import {
  listCompaniesForAdmin,
  type AdminCompanyRow,
} from "./company-repository";

export type ReportPeriod = "month" | "year";

export type PlatformReportCompany = AdminCompanyRow & {
  subscription: SubscriptionPeriod;
};

export type PlatformReport = {
  period: ReportPeriod;
  periodLabel: string;
  from: Date;
  to: Date;
  companies: PlatformReportCompany[];
  audit: AuditLogRowView[];
  stats: {
    companyCount: number;
    activeCount: number;
    suspendedCount: number;
    reviewCount: number;
    periodReviewCount: number;
    averageRating: number | null;
  };
};


export function reportBounds(
  period: ReportPeriod,
  now = new Date(),
): { from: Date; to: Date; label: string } {
  const from =
    period === "month"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const to =
    period === "month"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1)
      : new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1) - 1);
  const label =
    period === "month"
      ? new Intl.DateTimeFormat("fr-FR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(from)
      : `Année ${from.getUTCFullYear()}`;
  return { from, to, label };
}

/** Données complètes du rapport global, filtrées sur un mois ou une année. */
export async function getPlatformReport(
  period: ReportPeriod,
  now = new Date(),
): Promise<PlatformReport> {
  const { from, to, label } = reportBounds(period, now);
  const supabase = createAdminClient();

  const companiesPage = await listCompaniesForAdmin({
    page: 1,
    pageSize: 2000,
  });
  const companyIds = companiesPage.items.map((company) => company.id);

  const subscriptionMap = new Map<string, SubscriptionPeriod>();
  let reviews: { company_id: string; rating: number; created_at: string }[] = [];
  let audit: AuditLogRowView[] = [];

  if (companyIds.length > 0) {
    const [subscriptionsResult, reviewsResult, auditPage] = await Promise.all([
      supabase
        .from("company_subscriptions")
        .select("company_id, period")
        .in("company_id", companyIds),
      supabase
        .from("reviews")
        .select("company_id, rating, created_at")
        .in("company_id", companyIds),
      listAuditLog({ page: 1, pageSize: 5000, from, to }),
    ]);

    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    for (const entry of subscriptionsResult.data ?? []) {
      subscriptionMap.set(entry.company_id, entry.period);
    }
    reviews = reviewsResult.data ?? [];
    audit = auditPage.items;
  } else {
    const auditPage = await listAuditLog({
      page: 1,
      pageSize: 5000,
      from,
      to,
    });
    audit = auditPage.items;
  }

  const periodReviewCount = reviews.filter((review) => {
    const date = new Date(review.created_at);
    return date >= from && date <= to;
  }).length;
  const averageRating =
    reviews.length === 0
      ? null
      : Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10;

  const companies: PlatformReportCompany[] = companiesPage.items.map(
    (company) => ({
      ...company,
      subscription: subscriptionMap.get(company.id) ?? "trial",
    }),
  );

  return {
    period,
    periodLabel: label,
    from,
    to,
    companies,
    audit,
    stats: {
      companyCount: companies.length,
      activeCount: companies.filter((company) => company.status === "ACTIVE").length,
      suspendedCount: companies.filter(
        (company) => company.status === "SUSPENDED",
      ).length,
      reviewCount: reviews.length,
      periodReviewCount,
      averageRating,
    },
  };
}
