"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  DownloadIcon,
  QrIcon,
} from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/* Constantes DA AvisTrack                                            */
/* ------------------------------------------------------------------ */

const ACCENT_GREEN = "#0F5C47";
const ACCENT_ORANGE = "#C2410C";
const INK_BLACK = "#000000";
const WHITE = "#FFFFFF";

const PAGE_FORMATS: { id: string; label: string; w: number; h: number }[] = [
  { id: "A6", label: "A6 (105 × 148 mm)", w: 105, h: 148 },
  { id: "A5", label: "A5 (148 × 210 mm)", w: 148, h: 210 },
  { id: "A4", label: "A4 (210 × 297 mm)", w: 210, h: 297 },
];

const QR_COLORS = [
  { id: "black", label: "Noir", value: INK_BLACK },
  { id: "green", label: "Vert AvisTrack", value: ACCENT_GREEN },
] as const;

const LINK_MODES = [
  { id: "official", label: "Lien officiel pré-rempli" },
  { id: "custom", label: "Coller un lien" },
] as const;

const LOGO_AVISTRACK = "/assets/logoavistrack.png";

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

function mmToPx(mm: number, dpi: number): number {
  return (mm / 25.4) * dpi;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

/** Charge une image et la retourne en data URL (évite le CORS à l'export). */
function imageToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Impossible de charger ${url}`));
    img.src = url;
  });
}

/** Génère le SVG du QR code (erreur H, marge 4 modules). */
async function qrSvg(url: string, color: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 4,
    width: 1024,
    color: { dark: color, light: WHITE },
    errorCorrectionLevel: "H",
  });
}

/** Génère une data URL PNG du QR code (erreur H, marge 4 modules). */
async function generateQrDataUrl(
  url: string,
  color: string,
  size = 1024,
): Promise<string> {
  return QRCode.toDataURL(url, {
    type: "image/png",
    margin: 4,
    width: size,
    color: { dark: color, light: WHITE },
    errorCorrectionLevel: "H",
  });
}

/* ------------------------------------------------------------------ */
/* Dessin de l'affiche sur canvas (aperçu + exports)                  */
/* ------------------------------------------------------------------ */

type PosterDrawContext = {
  ctx: CanvasRenderingContext2D;
  w: number; // px
  h: number; // px
  dpi: number;
  companyName: string;
  avistrackLogoDataUrl: string;
  companyLogoDataUrl: string | null;
  qrPngDataUrl: string;
  qrColor: string;
};

function mm(dpi: number, value: number): number {
  return mmToPx(value, dpi);
}

/** Charge une image en data URL. */
function loadImageDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Impossible de charger ${url}`));
    img.src = url;
  });
}

function drawPoster({
  ctx,
  w,
  h,
  dpi,
  companyName,
  avistrackLogoDataUrl,
  companyLogoDataUrl,
  qrPngDataUrl,
  qrColor,
}: PosterDrawContext): void {
  const m = (v: number) => mm(dpi, v);
  const margin = m(9); // 9% ≈ marge confortable
  const headerH = m(22);

  /* Fond blanc */
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  /* ---- En-tête : logo AvisTrack à gauche, logo entreprise à droite ---- */
  ctx.save();
  ctx.translate(margin, margin);
  ctx.rect(0, 0, w - 2 * margin, headerH);
  ctx.clip();

  const logoSize = headerH * 0.7;

  const avistrackLogo = new Image();
  avistrackLogo.src = avistrackLogoDataUrl;
  /* Logo AvisTrack à gauche */
  ctx.drawImage(avistrackLogo, 0, 0, logoSize, logoSize);

  /* Logo entreprise ou initiales à droite */
  const rightX = w - 2 * margin - logoSize;
  if (companyLogoDataUrl) {
    const logo = new Image();
    logo.src = companyLogoDataUrl;
    ctx.drawImage(logo, rightX, 0, logoSize, logoSize);
  } else {
    const init = initials(companyName);
    const cx = rightX + logoSize / 2;
    const cy = logoSize / 2;
    const r = logoSize / 2 - 2;
    ctx.fillStyle = ACCENT_GREEN;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = `${r * 0.8}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(init, cx, cy);
  }
  ctx.restore();

  /* Séparateur fin sous l'en-tête */
  ctx.fillStyle = "#00000026";
  ctx.fillRect(margin, margin + headerH, w - 2 * margin, m(0.5));

  /* ---- QR code centré ---- */
  const qrImg = new Image();
  qrImg.src = qrPngDataUrl;

  const maxQrW = (w - 2 * margin) * 0.6;
  const qrSize = maxQrW;
  const qrX = (w - qrSize) / 2;
  const qrY = margin + headerH + m(14);

  /* Cadre fin autour du QR (couleur du QR) */
  const framePad = m(2);
  ctx.strokeStyle = qrColor;
  ctx.lineWidth = m(1);
  ctx.strokeRect(
    qrX - framePad,
    qrY - framePad,
    qrSize + 2 * framePad,
    qrSize + 2 * framePad,
  );

  /* Coins arrondis du QR via masque */
  ctx.save();
  const radius = m(4);
  ctx.beginPath();
  ctx.moveTo(qrX + radius, qrY);
  ctx.lineTo(qrX + qrSize - radius, qrY);
  ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + radius);
  ctx.lineTo(qrX + qrSize, qrY + qrSize - radius);
  ctx.quadraticCurveTo(
    qrX + qrSize,
    qrY + qrSize,
    qrX + qrSize - radius,
    qrY + qrSize,
  );
  ctx.lineTo(qrX + radius, qrY + qrSize);
  ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - radius);
  ctx.lineTo(qrX, qrY + radius);
  ctx.quadraticCurveTo(qrX, qrY, qrX + radius, qrY);
  ctx.clip();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();

  /* ---- "Scannez-moi" ---- */
  const scanY = qrY + qrSize + m(10);
  ctx.fillStyle = INK_BLACK;
  ctx.font = `bold ${m(10)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Scannez-moi", w / 2, scanY);

  /* Flèche de scan */
  ctx.fillStyle = ACCENT_ORANGE;
  ctx.beginPath();
  ctx.moveTo(w / 2 - m(3), scanY + m(4));
  ctx.lineTo(w / 2, scanY + m(10));
  ctx.lineTo(w / 2 + m(3), scanY + m(4));
  ctx.fill();

  /* Sous-texte */
  ctx.fillStyle = "#444444";
  ctx.font = `${m(4.5)}px sans-serif`;
  ctx.fillText("Donnez votre avis en 30 secondes", w / 2, scanY + m(16));

  /* ---- Pied de page ---- */
  ctx.fillStyle = INK_BLACK;
  ctx.font = `600 ${m(5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(companyName, w / 2, h - margin - m(6));

  ctx.fillStyle = "#666666";
  ctx.font = `${m(4)}px sans-serif`;
  ctx.fillText("Propulsé par AvisTrack", w / 2, h - margin + m(4));
}

/* ------------------------------------------------------------------ */
/* Composant                                                          */
/* ------------------------------------------------------------------ */

type QrStudioProps = {
  url: string;
  companyName?: string;
  companyLogoUrl?: string;
};

export function QrStudio({
  url: officialUrl,
  companyName = "Mon entreprise",
  companyLogoUrl,
}: QrStudioProps) {
  const [pageFormat, setPageFormat] = useState<"A6" | "A5" | "A4">("A6");
  const [qrColor, setQrColor] = useState<"black" | "green">("green");
  const [linkMode, setLinkMode] = useState<"official" | "custom">("official");
  const [customLink, setCustomLink] = useState("");
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [avistrackLogoDataUrl, setAvistrackLogoDataUrl] = useState<string | null>(null);
  const [qrSvgString, setQrSvgString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const format = useMemo(
    () => PAGE_FORMATS.find((f) => f.id === pageFormat)!,
    [pageFormat],
  );

  /* Précache le logo AvisTrack en data URL (évite le CORS à l'export) */
  useEffect(() => {
    loadImageDataUrl(LOGO_AVISTRACK)
      .then((data) => setAvistrackLogoDataUrl(data))
      .catch(() => setAvistrackLogoDataUrl(LOGO_AVISTRACK));
  }, []);

  const qrUrl = useMemo(() => {
    if (linkMode === "custom" && customLink.trim()) {
      const trimmed = customLink.trim();
      return /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
    }
    return officialUrl;
  }, [linkMode, customLink, officialUrl]);

  /* Générer le QR et le logo en data URL à chaque changement pertinent */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [qr, svg] = await Promise.all([
          generateQrDataUrl(qrUrl, qrColor === "green" ? ACCENT_GREEN : INK_BLACK),
          qrSvg(qrUrl, qrColor === "green" ? ACCENT_GREEN : INK_BLACK),
        ]);
        if (cancelled) return;
        setQrPngDataUrl(qr);
        setQrSvgString(svg);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }

      if (companyLogoUrl) {
        try {
          const data = await imageToDataUrl(companyLogoUrl);
          if (!cancelled) setLogoDataUrl(data);
        } catch {
          if (!cancelled) setLogoDataUrl(null);
        }
      } else {
        setLogoDataUrl(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [qrUrl, qrColor, companyLogoUrl]);

  /* Construire l'affiche complète en data URL (aperçu + base des exports) */
  const buildPoster = useCallback(async (dpi: number): Promise<string> => {
    if (!avistrackLogoDataUrl || !qrPngDataUrl) {
      throw new Error("Ressources non chargées");
    }
    const fmt = PAGE_FORMATS.find((f) => f.id === pageFormat)!;
    const w = mmToPx(fmt.w, dpi);
    const h = mmToPx(fmt.h, dpi);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext("2d")!;

    drawPoster({
      ctx,
      w: canvas.width,
      h: canvas.height,
      dpi,
      companyName,
      avistrackLogoDataUrl,
      companyLogoDataUrl: logoDataUrl,
      qrPngDataUrl,
      qrColor: qrColor === "green" ? ACCENT_GREEN : INK_BLACK,
    });

    return canvas.toDataURL("image/png");
  }, [pageFormat, qrPngDataUrl, logoDataUrl, companyName, qrColor, avistrackLogoDataUrl]);

  /* ---- Aperçu (HTML/CSS, fidèle au dessin canvas) ---- */
  const previewStyle = useMemo(() => {
    const fmt = PAGE_FORMATS.find((f) => f.id === pageFormat)!;
    const ratio = fmt.h / fmt.w;
    return {
      width: "100%",
      maxWidth: "160mm",
      aspectRatio: `${1 / ratio}`,
    } as React.CSSProperties;
  }, [pageFormat]);

  /* ---- Exports ---- */

  const downloadPng = useCallback(async () => {
    if (!qrPngDataUrl) return;
    setLoading(true);
    try {
      /* Largeur cible >= 2000 px */
      const dpi = Math.max(150, Math.ceil((2400 * 25.4) / format.w));
      const dataUrl = await buildPoster(dpi);
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${slugify(companyName)}-${pageFormat}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export PNG");
    } finally {
      setLoading(false);
    }
  }, [qrPngDataUrl, format, pageFormat, companyName, buildPoster]);

  const downloadPdf = useCallback(async () => {
    if (!qrPngDataUrl) return;
    setLoading(true);
    try {
      const fmt = PAGE_FORMATS.find((f) => f.id === pageFormat)!;
      const doc = new jsPDF({
        unit: "mm",
        format: [fmt.w, fmt.h] as [number, number],
      });
      const dataUrl = await buildPoster(150); /* 150 DPI suffit pour le PDF vectoriel-ish */
      const imgW = fmt.w;
      const imgH = (fmt.h / fmt.w) * imgW;
      doc.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
      doc.save(`qr-${slugify(companyName)}-${pageFormat}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export PDF");
    } finally {
      setLoading(false);
    }
  }, [qrPngDataUrl, pageFormat, companyName, buildPoster]);

  const downloadSvg = useCallback(() => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slugify(companyName)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [qrSvgString, companyName]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aperçu */}
        <div
          className="lg:col-span-7 flex flex-col items-center gap-4 border border-black/15 rounded-xl bg-white p-4 sm:p-6"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-semibold text-black">
              Aperçu de l&apos;affiche
            </span>
            <span className="text-xs text-gray-600">
              {pageFormat} • {fmtLabel(pageFormat)}
            </span>
          </div>
          <div
            className="relative w-full max-w-[160mm] aspect-[105/148] border border-black/20 bg-white overflow-hidden shadow-sm"
            style={previewStyle}
          >
            <div className="flex w-full h-full items-center justify-center p-4">
              {loading ? (
                <p className="text-sm text-gray-600">Génération de l&apos;affiche…</p>
              ) : qrPngDataUrl ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {/* En-tête aperçu */}
                  <div className="flex w-full items-center justify-between mb-2">
                    <img
                      src={LOGO_AVISTRACK}
                      alt="Logo AvisTrack"
                      className="h-8 w-auto"
                    />
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt="Logo de l'entreprise"
                        className="h-8 w-auto object-contain"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-green-800 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {initials(companyName)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="w-px h-2 bg-black/20 mx-2 mt-1"
                    style={{ alignSelf: "stretch" }}
                  />
                  {/* QR */}
                  <div className="relative flex items-center justify-center">
                    <img
                      src={qrPngDataUrl}
                      alt="QR code de votre fiche d'avis"
                      className="rounded-md border border-black/10 bg-white p-2 shadow-sm"
                      style={{
                        width: "60%",
                        maxWidth: "180px",
                        height: "auto",
                      }}
                    />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <span className="font-bold text-black text-lg">
                        Scannez-moi
                      </span>
                      <span className="text-xs text-gray-600 mt-1">
                        Donnez votre avis en 30 secondes
                      </span>
                    </div>
                  </div>
                  {/* Pied de page aperçu */}
                  <div className="mt-2 flex flex-col items-center">
                    <span className="font-semibold text-black">{companyName}</span>
                    <span className="text-xs text-gray-600">
                      Propulsé par AvisTrack
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Préparation de l&apos;affiche…</p>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-black">Format de page</h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Format de page">
              {PAGE_FORMATS.map((f) => {
                const active = f.id === pageFormat;
                return (
                  <Button
                    key={f.id}
                    type="button"
                    onClick={() => setPageFormat(f.id as "A6" | "A5" | "A4")}
                    variant={active ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={active}
                  >
                    {f.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-black">Couleur du QR</h3>
            <div className="flex gap-3" role="group" aria-label="Couleur du QR">
              {QR_COLORS.map((c) => {
                const active = qrColor === c.id;
                return (
                  <Button
                    key={c.id}
                    type="button"
                    onClick={() => setQrColor(c.id)}
                    variant={active ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={active}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="size-5 rounded-full border border-black/20"
                      style={{ backgroundColor: c.value }}
                    />
                    {c.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-black">Lien encodé</h3>
            <div className="flex gap-2" role="group" aria-label="Mode de lien">
              {LINK_MODES.map((m) => {
                const active = linkMode === m.id;
                return (
                  <Button
                    key={m.id}
                    type="button"
                    onClick={() => setLinkMode(m.id)}
                    variant={active ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={active}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
            {linkMode === "custom" && (
              <div className="mt-3">
                <label htmlFor="custom-link" className="text-xs font-semibold text-gray-600 block mb-1">
                  Votre lien
                </label>
                <input
                  id="custom-link"
                  type="url"
                  inputMode="url"
                  value={customLink}
                  onChange={(e) => setCustomLink(e.target.value)}
                  placeholder="https://exemple.com"
                  className="min-h-10 w-full rounded-md border border-black/30 bg-gray-50 px-3 text-sm text-black focus:border-accent focus:outline-none"
                />
              </div>
            )}
            <p className="text-xs text-gray-600">
              Le lien officiel est immuable et garantit que le QR scanné pointe
              toujours vers votre fiche d&apos;avis (RG-01).
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red bg-red/5 p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      {/* Barre d'actions en bas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <QrIcon className="size-4" aria-hidden />
          <span>Lien : {qrUrl}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={downloadSvg}
            disabled={!qrSvgString}
            size="sm"
          >
            <DownloadIcon className="size-4" /> SVG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPng}
            disabled={loading || !qrPngDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> PNG HD
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPdf}
            disabled={loading || !qrPngDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> PDF {pageFormat}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(qrUrl);
            }}
            size="sm"
          >
            <CopyIcon className="size-4" /> Copier le lien
          </Button>
        </div>
      </div>
    </div>
  );
}

function fmtLabel(id: string): string {
  const f = PAGE_FORMATS.find((x) => x.id === id);
  return f ? `${f.w} × ${f.h} mm` : "";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "entreprise";
}
