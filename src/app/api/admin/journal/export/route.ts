import type { NextRequest } from "next/server";
import { requireAdminPermission } from "@/server/auth/guards";
import type { AuditAction } from "@/server/domain";
import { listAuditLog } from "@/server/repositories/audit-log-repository";


const ACTION_LABELS: Record<AuditAction, string> = {
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  DELETE: "Suppression",
  INVITE_ADMIN: "Ajout utilisateur",
  UPDATE_ADMIN_ROLE: "Changement rôle",
  REMOVE_ADMIN: "Retrait utilisateur",
  UPDATE_SUBSCRIPTION: "Mise à jour abonnement",
  DOWNLOAD_REPORT: "Téléchargement rapport",
  PAYMENT: "Paiement",
  CREATE_ROLE: "Création rôle",
  UPDATE_ROLE: "Mise à jour rôle",
};

const PERIOD_DAYS: Record<string, number> = {
  semaine: 7,
  mois: 30,
  annee: 365,
};

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("audit");
  } catch {
    return new Response("Accès refusé.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const rawAction = searchParams.get("action") ?? "";
  const action = (Object.keys(ACTION_LABELS) as AuditAction[]).find(
    (value) => value === rawAction,
  );
  const query = (searchParams.get("q") ?? "").replace(/[,()%]/g, " ").trim();
  const days = PERIOD_DAYS[searchParams.get("periode") ?? ""] ?? 0;
  const from = days
    ? new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    : undefined;
  if (from) from.setUTCHours(0, 0, 0, 0);

  const { items } = await listAuditLog({
    page: 1,
    pageSize: 5000,
    action,
    query: query || undefined,
    from,
  });
  const rows = items.map((entry) => ({
    date: entry.createdAt.toLocaleString("fr-FR"),
    admin: entry.adminEmail,
    action: ACTION_LABELS[entry.action],
    company: entry.companyName ?? "—",
    reason: entry.reason ?? "—",
  }));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const header = ["Date", "Administrateur", "Action", "Entreprise", "Motif"];
    const lines = [
      header.map(csvCell).join(";"),
      ...rows.map((row) =>
        [row.date, row.admin, row.action, row.company, row.reason]
          .map(csvCell)
          .join(";"),
      ),
    ];
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-audit-${stamp}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const columns = [
    { label: "Date", x: 12, width: 42 },
    { label: "Administrateur", x: 56, width: 55 },
    { label: "Action", x: 113, width: 42 },
    { label: "Entreprise", x: 157, width: 60 },
    { label: "Motif", x: 219, width: width - 229 },
  ];

  const drawHeader = () => {
    doc.setFillColor(15, 92, 71);
    doc.rect(0, 0, width, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("AvisTrack · Journal d'audit", 12, 9);
    doc.setFontSize(8);
    doc.text(
      `${rows.length} action${rows.length > 1 ? "s" : ""} exportée${rows.length > 1 ? "s" : ""} le ${new Date().toLocaleString("fr-FR")}`,
      12,
      14,
    );
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    columns.forEach((column) => doc.text(column.label, column.x, 25));
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200, 200, 200);
    doc.line(12, 27, width - 12, 27);
  };

  drawHeader();
  let y = 32;
  doc.setFontSize(7);
  for (const row of rows) {
    if (y > height - 12) {
      doc.addPage();
      drawHeader();
      y = 32;
      doc.setFontSize(7);
    }
    const values = [row.date, row.admin, row.action, row.company, row.reason];
    values.forEach((value, index) => {
      const column = columns[index]!;
      const text = doc.splitTextToSize(truncate(value, 150), column.width)[0] ?? "";
      doc.text(text, column.x, y);
    });
    y += 5;
  }

  const bytes = doc.output("arraybuffer");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="journal-audit-${stamp}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
