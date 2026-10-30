import type { NextRequest } from "next/server";
import { getCurrentCompany } from "@/server/auth/guards";
import { findPayment } from "@/server/repositories/subscription-repository";
import { formatCurrency, formatDate } from "@/lib/format";


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const company = await getCurrentCompany();
  if (!company) return new Response("Non autorisé.", { status: 401 });

  const { id } = await params;
  const payment = await findPayment(company.id, id);
  if (!payment) return new Response("Reçu introuvable.", { status: 404 });

  const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ unit: "mm", format: "a6" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 92, 71);
  doc.rect(0, 0, width, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("AvisTrack", 10, 11);
  doc.setFontSize(8);
  doc.text("Reçu de paiement", 10, 18);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let y = 34;
  const line = (label: string, value: string) => {
    doc.setTextColor(90, 90, 90);
    doc.text(label, 10, y);
    doc.setTextColor(0, 0, 0);
    doc.text(value, 55, y);
    y += 7;
  };
  line("Entreprise", company.name);
  line("Date", formatDate(payment.createdAt));
  line("Offre", payment.period === "annual" ? "Pro annuel" : "Pro mensuel");
  line("Montant", formatCurrency(payment.amount));
  line("Statut", "Payé");
  line("Référence", payment.id);
  line("Prestataire", payment.provider);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Document généré pour une démonstration — aucun débit réel.", 10, 78);

  return new Response(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-avistrack-${payment.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
