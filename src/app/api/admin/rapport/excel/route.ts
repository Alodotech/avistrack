import type { NextRequest } from "next/server";
import { requireAdminPermission } from "@/server/auth/guards";
import { buildPlatformReportExcel } from "@/lib/platform-report-excel";
import {
  getPlatformReport,
  type ReportPeriod,
} from "@/server/repositories/platform-report-repository";
import { recordReportDownload } from "@/server/repositories/report-download-repository";

/**
 * Export Excel du rapport global.
 *
 * Contrairement à l'ancien export navigateur, la génération et la
 * journalisation se font ici : chaque téléchargement apparaît dans
 * `report_downloads` et dans le journal d'audit.
 */

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
  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    return new Date(Date.UTC(year, 6, 1));
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

  const { bytes, filename } = await buildPlatformReportExcel({
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
  });

  await recordReportDownload({
    admin,
    period,
    label: report.periodLabel,
    format: "excel",
  });

  // `Response` attend un `ArrayBuffer` exact : la vue du buffer est découpée
  // pour ne pas embarquer les octets voisins.
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
