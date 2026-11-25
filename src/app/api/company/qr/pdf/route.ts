import { getCurrentCompany } from "@/server/auth/guards";
import { isCompanyAccessBlocked } from "@/server/services/company-access";
import { publicReviewUrl, renderQrPng } from "@/server/services/qr";

/**
 * Affiche A6 (105 × 148 mm) prête à imprimer : QR code centré, logo de
 * l'entreprise au-dessus s'il existe, nom et consigne de scan.
 */

async function logoDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "entreprise";
}

export async function GET() {
  const company = await getCurrentCompany();
  if (!company) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (company.status !== "ACTIVE") {
    return Response.json({ error: "Compte inactif." }, { status: 403 });
  }
  if (await isCompanyAccessBlocked(company)) {
    return Response.json({ error: "Abonnement expiré." }, { status: 403 });
  }

  const url = publicReviewUrl(company.publicId);
  const [qr, logo] = await Promise.all([
    renderQrPng(url),
    company.logoUrl ? logoDataUrl(company.logoUrl) : Promise.resolve(null),
  ]);

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a6" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const center = pageWidth / 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

  let cursorY = 16;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", center - 10, 10, 20, 20);
      cursorY = 36;
    } catch {
      // Un logo illisible ne doit jamais bloquer l'export.
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(logo ? 13 : 15);
  doc.text(company.name, center, cursorY, {
    align: "center",
    maxWidth: pageWidth - 20,
  });

  const qrSize = 68;
  doc.addImage(
    `data:image/png;base64,${Buffer.from(qr).toString("base64")}`,
    "PNG",
    (pageWidth - qrSize) / 2,
    46,
    qrSize,
    qrSize,
  );

  doc.setFontSize(11);
  doc.text("Scannez pour donner votre avis", center, 126, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text("AvisTrack", center, 140, { align: "center" });

  const bytes = new Uint8Array(doc.output("arraybuffer"));

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="affiche-qr-${slug(company.name)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
