import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/site-url";

/**
 * Génération déterministe du QR code, sans stockage d'image (§10.1).
 * Le contenu encodé ne dépend que du `public_id`, immuable (RG-01).
 */

const QR_OPTIONS = { margin: 2, errorCorrectionLevel: "M" } as const;

export function publicReviewUrl(publicId: string): string {
  return `${siteUrl()}/avis/${encodeURIComponent(publicId)}`;
}

export function renderQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png", width: 1024 });
}

export function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}
