import "server-only";
import QRCode from "qrcode";

/**
 * Génération déterministe du QR code, sans stockage d'image (§10.1).
 * Le contenu encodé ne dépend que du `public_id`, immuable (RG-01).
 */

const QR_OPTIONS = { margin: 2, errorCorrectionLevel: "M" } as const;

function appBaseUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    // Un QR code imprimé avec un mauvais domaine est irrécupérable (PO-06).
    throw new Error("APP_URL doit être défini en production.");
  }
  return "http://localhost:3000";
}

export function publicReviewUrl(publicId: string): string {
  return `${appBaseUrl()}/avis/${encodeURIComponent(publicId)}`;
}

export function renderQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png", width: 1024 });
}

export function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}
