import "server-only";
import { formatDate } from "./format";
import type { SerializablePlatformReport } from "@/app/(admin)/admin/rapports/actions";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai",
  monthly: "Mensuel",
  annual: "Annuel",
};

function header(values: string[]) {
  return values.map((value) => ({
    value,
    fontWeight: "bold" as const,
    backgroundColor: "#0a0a0a",
    textColor: "#ffffff",
    wrap: true,
  }));
}

/**
 * Classeur Excel du rapport global, produit côté serveur.
 *
 * L'export passe par `/api/admin/rapport/excel` : la génération et la
 * journalisation du téléchargement ne dépendent plus du navigateur.
 */
export async function buildPlatformReportExcel(
  report: SerializablePlatformReport,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { default: writeXlsxFile } = await import("write-excel-file/node");

  const companies = [
    header([
      "Entreprise",
      "Identifiant public",
      "E-mail",
      "Téléphone",
      "Logo",
      "Statut",
      "Inscription",
      "Abonnement",
      "Avis",
      "Note moyenne",
    ]),
    ...report.companies.map((company) => [
      company.name,
      company.publicId,
      company.email,
      company.phone,
      company.logoUrl ?? "",
      STATUS_LABELS[company.status] ?? company.status,
      formatDate(company.createdAt),
      PLAN_LABELS[company.subscription] ?? company.subscription,
      company.reviewCount,
      company.averageRating ?? "",
    ]),
  ];

  const audit = [
    header(["Date", "Administrateur", "Action", "Entreprise", "Motif"]),
    ...report.audit.map((entry) => [
      formatDate(entry.createdAt),
      entry.adminEmail,
      entry.action,
      entry.companyName ?? "",
      entry.reason ?? "",
    ]),
  ];

  const summary = [
    ["Rapport AvisTrack", report.periodLabel],
    ["Période", `Du ${formatDate(report.from)} au ${formatDate(report.to)}`],
    ["Entreprises", report.stats.companyCount],
    ["Entreprises actives", report.stats.activeCount],
    ["Entreprises suspendues", report.stats.suspendedCount],
    ["Avis au total", report.stats.reviewCount],
    ["Avis sur la période", report.stats.periodReviewCount],
    ["Note moyenne", report.stats.averageRating ?? ""],
  ];

  const bytes = await writeXlsxFile(
    [
      { sheet: "Synthèse", data: summary, columns: [{ width: 32 }, { width: 42 }] },
      {
        sheet: "Entreprises",
        data: companies,
        columns: [
          { width: 28 },
          { width: 34 },
          { width: 26 },
          { width: 16 },
          { width: 30 },
          { width: 12 },
          { width: 14 },
          { width: 14 },
          { width: 8 },
          { width: 12 },
        ],
      },
      {
        sheet: "Journal d'audit",
        data: audit,
        columns: [
          { width: 18 },
          { width: 28 },
          { width: 22 },
          { width: 34 },
          { width: 50 },
        ],
      },
    ],
    { fontFamily: "Inter" },
  ).toBuffer();

  return {
    bytes: new Uint8Array(bytes),
    filename: `rapport-avistrack-${report.period}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`,
  };
}
