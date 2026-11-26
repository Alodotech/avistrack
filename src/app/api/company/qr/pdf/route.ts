import { getCurrentCompany } from "@/server/auth/guards";
import { isCompanyAccessBlocked } from "@/server/services/company-access";
import { publicReviewUrl, renderQrPng } from "@/server/services/qr";

/**
 * Affiche A6 prête à imprimer, personnalisée avec le nom de l'entreprise.
 */

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
  const qr = await renderQrPng(url, "#D71920");

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a6" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const center = pageWidth / 2;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setDrawColor(235, 235, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(5, 5, pageWidth - 10, pageHeight - 10, 4, 4, "S");

  doc.setFillColor(255, 241, 241);
  doc.roundedRect(center - 23, 12, 46, 7, 3.5, 3.5, "F");
  doc.setTextColor(215, 25, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("30 SECONDES POUR NOUS AIDER", center, 16.5, {
    align: "center",
  });
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Votre avis compte !", center, 37, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(85, 85, 85);
  doc.setFontSize(9);
  doc.text("Scannez pour partager votre expérience", center, 45, {
    align: "center",
  });

  const frameSize = 70;
  const frameX = (pageWidth - frameSize) / 2;
  const frameY = 51;
  doc.setFillColor(255, 249, 249);
  doc.setDrawColor(240, 190, 192);
  doc.setLineWidth(0.7);
  doc.roundedRect(frameX, frameY, frameSize, frameSize, 5, 5, "FD");

  const qrSize = 60;
  doc.addImage(
    `data:image/png;base64,${Buffer.from(qr).toString("base64")}`,
    "PNG",
    center - qrSize / 2,
    frameY + (frameSize - qrSize) / 2,
    qrSize,
    qrSize,
  );

  doc.setDrawColor(235, 235, 235);
  doc.line(18, 130, pageWidth - 18, 130);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(company.name, pageWidth - 24), center, 138, {
    align: "center",
  });

  const bytes = new Uint8Array(doc.output("arraybuffer"));

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="affiche-qr-${slug(company.name)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
