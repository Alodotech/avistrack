import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { requireAdminPermission } from "@/server/auth/guards";
import { buildPlatformReportPdf } from "@/lib/platform-report-export";
import {
  getPlatformReport,
  type ReportPeriod,
} from "@/server/repositories/platform-report-repository";
import { recordReportDownload } from "@/server/repositories/report-download-repository";


async function logoDataUrl(): Promise<string | null> {
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public", "assets", "logoavistrack.png"),
    );
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function parsePeriod(value: string | null): ReportPeriod {
  return value === "annuel" || value === "year" ? "year" : "month";
}

function parseReference(searchParams: URLSearchParams): Date {
  const now = new Date();
  const year = Number(searchParams.get("annee"));
  const month = Number(searchParams.get("mois"));
  if (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return new Date(Date.UTC(year, month - 1, 15));
  }
  return now;
}

export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdminPermission("reports");
  } catch {
    return new Response("Accès refusé.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("type") ?? searchParams.get("periode"));
  const report = await getPlatformReport(period, parseReference(searchParams));
  const serializable = {
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

  const { bytes, filename } = await buildPlatformReportPdf(serializable, {
    logoDataUrl: await logoDataUrl(),
  });

  await recordReportDownload({
    admin,
    period,
    label: report.periodLabel,
    format: "pdf",
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
