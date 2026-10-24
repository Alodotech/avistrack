import type { NextRequest } from "next/server";
import { getCurrentCompany } from "@/server/auth/guards";
import {
  publicReviewUrl,
  renderQrPng,
  renderQrSvg,
} from "@/server/services/qr";

/**
 * QR code de l'entreprise de la session (DE-01, DE-02).
 * Aucun identifiant d'entreprise n'est lu dans la requête.
 */
export async function GET(request: NextRequest) {
  const company = await getCurrentCompany();
  if (!company) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (company.status !== "ACTIVE") {
    return Response.json({ error: "Compte inactif." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const url = publicReviewUrl(company.publicId);

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (searchParams.has("download")) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="qr-code-avistrack.${format}"`,
    );
  }

  if (format === "svg") {
    headers.set("Content-Type", "image/svg+xml; charset=utf-8");
    return new Response(await renderQrSvg(url), { headers });
  }

  headers.set("Content-Type", "image/png");
  return new Response(new Uint8Array(await renderQrPng(url)), { headers });
}
