"use server";

import { requireAdminPermission } from "@/server/auth/guards";
import {
  getPlatformReport,
  type ReportPeriod,
} from "@/server/repositories/platform-report-repository";
import type {
  PlatformReport,
  PlatformReportCompany,
} from "@/server/repositories/platform-report-repository";
import type { AuditAction } from "@/server/domain";

export type SerializableReportCompany = Omit<PlatformReportCompany, "createdAt"> & {
  createdAt: string;
};

export type SerializableReportAudit = {
  id: string;
  action: AuditAction;
  adminEmail: string;
  companyName: string | null;
  reason: string | null;
  createdAt: string;
};

export type SerializablePlatformReport = {
  period: ReportPeriod;
  periodLabel: string;
  from: string;
  to: string;
  companies: SerializableReportCompany[];
  audit: SerializableReportAudit[];
  stats: PlatformReport["stats"];
};

function serialize(report: PlatformReport): SerializablePlatformReport {
  return {
    ...report,
    from: report.from.toISOString(),
    to: report.to.toISOString(),
    companies: report.companies.map((company) => ({
      ...company,
      createdAt: company.createdAt.toISOString(),
    })),
    audit: report.audit.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function fetchPlatformReportAction(
  period: ReportPeriod,
): Promise<SerializablePlatformReport> {
  await requireAdminPermission("reports");
  if (period !== "month" && period !== "year") {
    throw new Error("Période de rapport invalide.");
  }
  return serialize(await getPlatformReport(period));
}
