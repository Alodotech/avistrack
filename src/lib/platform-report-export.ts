import { formatDate } from "./format";
import type { SerializablePlatformReport } from "@/app/(admin)/admin/rapports/actions";

const FOREST: [number, number, number] = [15, 92, 71];
const ORANGE: [number, number, number] = [194, 65, 12];
const MARGIN = 12;

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

function periodRange(report: SerializablePlatformReport): string {
  return `Du ${formatDate(report.from)} au ${formatDate(report.to)}`;
}

function reportFilename(report: SerializablePlatformReport): string {
  return `rapport-avistrack-${report.period}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

async function browserLogo(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/assets/logoavistrack.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildPlatformReportPdf(
  report: SerializablePlatformReport,
  options: { logoDataUrl?: string | null } = {},
): Promise<{ bytes: ArrayBuffer; filename: string }> {
  const [{ default: jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logo = options.logoDataUrl ?? null;

  doc.setFillColor(...FOREST);
  doc.rect(0, 0, pageWidth, 26, "F");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, 4, 18, 18);
    } catch {
      // Le logo ne doit jamais bloquer l'export.
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text("AvisTrack", MARGIN + (logo ? 23 : 0), 12);
  doc.setFontSize(9);
  doc.text(
    `Rapport ${report.period === "month" ? "mensuel" : "annuel"} — ${report.periodLabel}`,
    MARGIN + (logo ? 23 : 0),
    19,
  );

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(`Rapport global — ${report.periodLabel}`, MARGIN, 36);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(periodRange(report), MARGIN, 42);
  doc.text(
    `Extrait le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date())}`,
    MARGIN,
    47,
  );

  autoTable(doc, {
    startY: 52,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Entreprises", String(report.stats.companyCount)],
      ["Entreprises actives", String(report.stats.activeCount)],
      ["Entreprises suspendues", String(report.stats.suspendedCount)],
      ["Avis au total", String(report.stats.reviewCount)],
      ["Avis reçus sur la période", String(report.stats.periodReviewCount)],
      [
        "Note moyenne",
        report.stats.averageRating === null
          ? "—"
          : `${report.stats.averageRating.toFixed(1)} / 5`,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: FOREST, textColor: 255 },
    margin: { left: MARGIN, right: MARGIN },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : 80,
    head: [["Entreprise", "Identifiant", "Contact", "Statut", "Inscription", "Abonnement", "Avis", "Note"]],
    body: report.companies.map((company) => [
      company.name,
      company.publicId,
      [company.email, company.phone].filter(Boolean).join(" · "),
      STATUS_LABELS[company.status] ?? company.status,
      formatDate(company.createdAt),
      PLAN_LABELS[company.subscription] ?? company.subscription,
      String(company.reviewCount),
      company.averageRating === null ? "—" : company.averageRating.toFixed(1),
    ]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: ORANGE, textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: MARGIN, right: MARGIN },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : 120,
    head: [["Date", "Administrateur", "Action", "Entreprise", "Motif"]],
    body: report.audit.map((entry) => [
      formatDate(entry.createdAt),
      entry.adminEmail,
      entry.action,
      entry.companyName ?? "—",
      entry.reason ?? "—",
    ]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: FOREST, textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("AvisTrack — rapport global", MARGIN, pageHeight - 7);
      doc.text(`Page ${page}`, pageWidth - MARGIN, pageHeight - 7, {
        align: "right",
      });
    },
  });

  return {
    bytes: doc.output("arraybuffer"),
    filename: reportFilename(report),
  };
}

export async function exportPlatformReportPDF(
  report: SerializablePlatformReport,
): Promise<void> {
  const { bytes, filename } = await buildPlatformReportPdf(report, {
    logoDataUrl: await browserLogo(),
  });
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportPlatformReportExcel(
  report: SerializablePlatformReport,
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const header = (values: string[]) =>
    values.map((value) => ({
      value,
      fontWeight: "bold" as const,
      backgroundColor: "#0a0a0a",
      textColor: "#ffffff",
      wrap: true,
    }));

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
    ["Période", periodRange(report)],
    ["Entreprises", report.stats.companyCount],
    ["Entreprises actives", report.stats.activeCount],
    ["Entreprises suspendues", report.stats.suspendedCount],
    ["Avis au total", report.stats.reviewCount],
    ["Avis sur la période", report.stats.periodReviewCount],
    ["Note moyenne", report.stats.averageRating ?? ""],
  ];

  await writeXlsxFile(
    [
      { sheet: "Synthèse", data: summary, columns: [{ width: 32 }, { width: 42 }] },
      {
        sheet: "Entreprises",
        data: companies,
        columns: [
          { width: 28 }, { width: 34 }, { width: 26 }, { width: 16 }, { width: 30 },
          { width: 12 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 12 },
        ],
      },
      {
        sheet: "Journal d'audit",
        data: audit,
        columns: [{ width: 18 }, { width: 28 }, { width: 22 }, { width: 34 }, { width: 50 }],
      },
    ],
    { fontFamily: "Inter" },
  ).toFile(
    `rapport-avistrack-${report.period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
