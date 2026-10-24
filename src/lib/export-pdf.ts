import { formatDate } from "./format";

/**
 * Export PDF du registre des entreprises (T33).
 *
 * Le module s'exécute dans le navigateur : il reçoit les lignes déjà filtrées
 * et les filtre côté serveur, et n'a accès à aucun secret.
 */

/** Ligne exportable : les dates sont transportées en ISO. */
export type ExportableCompany = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Date d'inscription au format ISO. */
  createdAt: string;
  reviewCount: number;
  averageRating: number | null;
  status: string;
};

export type ExportMeta = {
  /** Période sélectionnée, en toutes lettres. */
  period: string;
  /** Statut filtre, en toutes lettres. */
  status: string;
  /** Recherche textuelle éventuellement appliquée. */
  search: string;
};

const BRAND_RED: [number, number, number] = [215, 25, 32];
const MARGIN = 14;

const HEADERS = [
  "Nom",
  "E-mail",
  "Téléphone",
  "Inscrit le",
  "Total d'avis",
  "Note moyenne",
  "Statut",
];

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  pending: "En attente",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Récupère le logo officiel en PNG afin que jsPDF puisse l'insérer. */
async function logoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/assets/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Génère et télécharge le rapport PDF.
 *
 * @param companies Lignes filtrées à publier
 * @param meta Période, statut et recherche appliqués
 */
export async function exportCompaniesPDF(
  companies: ExportableCompany[],
  meta: ExportMeta,
): Promise<void> {
  const [{ default: jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Bandeau de marque + logo officiel.
  doc.setFillColor(...BRAND_RED);
  doc.rect(0, 0, pageWidth, 28, "F");

  const logo = await logoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN, 5, 18, 18);
    } catch {
      // Un logo illisible ne doit pas empêcher l'export.
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text("AvisTrack", MARGIN + (logo ? 23 : 0), 13);
  doc.setFontSize(10);
  doc.text("Rapport d'activité des entreprises", MARGIN + (logo ? 23 : 0), 21);

  // Titre, période et date d'extraction.
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Rapport d'activité des entreprises — AvisTrack", MARGIN, 40);

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(meta.period, MARGIN, 47);
  doc.text(meta.status, MARGIN, 52);
  if (meta.search) {
    doc.text(`Recherche : « ${meta.search} »`, MARGIN, 57);
  }
  doc.text(
    `Extrait le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date())}`,
    MARGIN,
    meta.search ? 62 : 57,
  );

  const data = companies.map((company) => [
    company.name,
    company.email,
    company.phone || "—",
    formatDate(company.createdAt),
    String(company.reviewCount),
    company.averageRating === null ? "—" : company.averageRating.toFixed(1),
    statusLabel(company.status),
  ]);

  autoTable(doc, {
    startY: meta.search ? 68 : 63,
    head: [HEADERS],
    body: data,
    theme: "grid",
    styles: { cellPadding: 2.5, fontSize: 8, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `AvisTrack — ${companies.length} entreprise${companies.length > 1 ? "s" : ""}`,
        MARGIN,
        pageHeight - 8,
      );
      doc.text(
        `Page ${page}`,
        pageWidth - MARGIN,
        pageHeight - 8,
        { align: "right" },
      );
    },
  });

  doc.save(`rapport-entreprises-${new Date().toISOString().slice(0, 10)}.pdf`);
}
