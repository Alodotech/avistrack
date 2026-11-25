import { formatDate } from "./format";
import type { ExportableCompany, ExportMeta } from "./export-pdf";

/**
 * Export Excel (XLSX) du registre des entreprises (T34).
 *
 * Comme le PDF, ce module s'exécute dans le navigateur : il ne reçoit que les
 * lignes déjà filtrées, en clair, et n'a accès à aucun secret.
 *
 * La génération s'appuie sur `write-excel-file`, sans dépendance native et
 * sans vulnérabilité connue, au lieu de `xlsx` (prototype pollution et ReDoS
 * non corrigés à ce jour).
 */

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  pending: "En attente",
};

/** Couleurs de la charte, reprises de `globals.css`. */
const HEADER_BACKGROUND = "#0a0a0a";
const HEADER_TEXT = "#ffffff";
const ACCENT = "#d71920";

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Génère et télécharge le fichier Excel.
 *
 * @param companies Lignes filtrées à publier
 * @param meta Période, statut et recherche appliqués
 */
export async function exportCompaniesExcel(
  companies: ExportableCompany[],
  meta: ExportMeta,
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const header = [
    "Nom",
    "E-mail",
    "Téléphone",
    "Inscrit le",
    "Total d'avis",
    "Note moyenne",
    "Statut",
  ];

  const headerRow = header.map((label) => ({
    value: label,
    fontWeight: "bold" as const,
    backgroundColor: HEADER_BACKGROUND,
    textColor: HEADER_TEXT,
    align: "left" as const,
    wrap: true,
  }));

  const rows = companies.map((company) => [
    company.name,
    company.email,
    company.phone,
    formatDate(company.createdAt),
    company.reviewCount,
    company.averageRating === null
      ? ""
      : Number(company.averageRating.toFixed(1)),
    statusLabel(company.status),
  ]);

  const contextRows: (string | number)[][] = [
    ["Rapport d'activité des entreprises — AvisTrack"],
    [meta.period],
    [meta.status],
    ...(meta.search ? [["Recherche", meta.search]] : []),
    ["Entreprises exportées", companies.length],
    ["Extrait le", formatDate(new Date().toISOString())],
  ];

  await writeXlsxFile(
    [
      {
        sheet: "Entreprises",
        data: [headerRow, ...rows],
        columns: [
          { width: 34 },
          { width: 30 },
          { width: 18 },
          { width: 14 },
          { width: 13 },
          { width: 14 },
          { width: 12 },
        ],
      },
      {
        sheet: "Contexte",
        data: contextRows.map((row, index) =>
          index === 0
            ? [
                {
                  value: String(row[0]),
                  fontWeight: "bold" as const,
                  textColor: ACCENT,
                },
              ]
            : row,
        ),
        columns: [{ width: 34 }, { width: 40 }],
      },
    ],
    { fontFamily: "Inter" },
  ).toFile(
    `entreprises-avistrack-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
