"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
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
const INK_BLACK = "#000000";
const WHITE = "#FFFFFF";

const PAGE_FORMATS: {
  id: string;
  label: string;
  w: number; // mm
  h: number; // mm
  logicalW: number; // px (96 DPI)
  logicalH: number; // px (96 DPI)
}[] = [
  { id: "A6", label: "A6 (105 × 148 mm)", w: 105, h: 148, logicalW: 397, logicalH: 559 },
  { id: "A5", label: "A5 (148 × 210 mm)", w: 148, h: 210, logicalW: 559, logicalH: 794 },
  { id: "A4", label: "A4 (210 × 297 mm)", w: 210, h: 297, logicalW: 794, logicalH: 1123 },
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

const MARGIN_PCT = 0.08; // 8% de chaque côté
const QR_WIDTH_PCT = 0.60; // 60% de la largeur logique

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "entreprise";
}

/** Charge une image et la retourne en data URL (évite le CORS à l'export). */
function loadImageDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
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
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/** Génère le SVG du QR code (erreur H, marge 4 modules). */
async function generateQrSvg(url: string, color: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 4,
    width: 1024,
    color: { dark: color, light: WHITE },
    errorCorrectionLevel: "H",
  });
}

/* ------------------------------------------------------------------ */
/* QrPoster : rendu unique de l'affiche, utilisé pour l'aperçu ET les exports */
/* ------------------------------------------------------------------ */

type QrPosterProps = {
  logicalW: number;
  logicalH: number;
  companyName: string;
  avistrackLogoDataUrl: string;
  companyLogoDataUrl: string | null;
  qrSvgDataUrl: string;
  qrColor: string;
};

/** Affiche QR à taille logique fixe, layout flex sans position absolue. */
function QrPoster({
  logicalW,
  logicalH,
  companyName,
  avistrackLogoDataUrl,
  companyLogoDataUrl,
  qrSvgDataUrl,
  qrColor,
}: QrPosterProps) {
  const margin = Math.round(logicalW * MARGIN_PCT);
  const contentW = logicalW - 2 * margin;
  const headerH = Math.round(logicalH * 0.12);
  const footerH = Math.round(logicalH * 0.08);
  const logoSize = Math.round(headerH * 0.65);
  const qrSize = Math.round(contentW * QR_WIDTH_PCT);

  const posterStyle: CSSProperties = {
    width: logicalW,
    height: logicalH,
    background: WHITE,
    color: INK_BLACK,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  };

  const headerStyle: CSSProperties = {
    height: headerH,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${Math.round(headerH * 0.25)}px ${margin}px`,
    boxSizing: "border-box",
    borderBottom: `1px solid #00000026`,
  };

  const logoImgStyle: CSSProperties = {
    width: logoSize,
    height: logoSize,
    objectFit: "contain",
    display: "block",
  };

  const initialsStyle: CSSProperties = {
    width: logoSize,
    height: logoSize,
    borderRadius: "50%",
    backgroundColor: ACCENT_GREEN,
    color: WHITE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: Math.round(logoSize * 0.5),
    lineHeight: "1",
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    padding: `0 ${margin}px`,
    boxSizing: "border-box",
  };

  const titleStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.08),
    fontWeight: "800",
    textAlign: "center",
    margin: 0,
    color: INK_BLACK,
  };

  const qrContainerStyle: CSSProperties = {
    width: qrSize,
    height: qrSize,
    borderRadius: Math.round(qrSize * 0.05),
    border: `2px solid ${qrColor}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: WHITE,
    boxSizing: "border-box",
  };

  const qrImgStyle: CSSProperties = {
    width: `${QR_WIDTH_PCT * 100}%`, // 60% du cadre, laisse une marge blanche de 4 modules
    height: "auto",
    display: "block",
  };

  const subtitleStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.045),
    color: "#444444",
    textAlign: "center",
    margin: 0,
  };

  const footerStyle: CSSProperties = {
    height: footerH,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: `0 ${margin}px`,
    boxSizing: "border-box",
  };

  const companyNameStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.055),
    fontWeight: "600",
    color: INK_BLACK,
    textAlign: "center",
    margin: 0,
  };

  const poweredByStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.04),
    color: "#666666",
    textAlign: "center",
    margin: 0,
  };

  return (
    <div style={posterStyle}>
      <header style={headerStyle}>
        <img
          src={avistrackLogoDataUrl}
          alt="Logo AvisTrack"
          style={logoImgStyle}
          loading="eager"
        />
        {companyLogoDataUrl ? (
          <img
            src={companyLogoDataUrl}
            alt="Logo de l'entreprise"
            style={logoImgStyle}
          />
        ) : (
          <div style={initialsStyle}>
            {initials(companyName)}
          </div>
        )}
      </header>

      <main style={bodyStyle}>
        <h1 style={titleStyle}>Scannez-moi</h1>
        <div style={qrContainerStyle}>
          <img
            src={qrSvgDataUrl}
            alt="QR code de votre fiche d'avis"
            style={qrImgStyle}
          />
        </div>
        <p style={subtitleStyle}>Donnez votre avis en 30 secondes</p>
      </main>

      <footer style={footerStyle}>
        <span style={companyNameStyle}>{companyName}</span>
        <span style={poweredByStyle}>Propulsé par AvisTrack</span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QrStudio : contrôles, état et exports                              */
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
  const [pageFormatId, setPageFormatId] = useState<"A6" | "A5" | "A4">("A6");
  const [qrColorId, setQrColorId] = useState<"black" | "green">("green");
  const [linkMode, setLinkMode] = useState<"official" | "custom">("official");
  const [customLink, setCustomLink] = useState("");
  const [qrSvgDataUrl, setQrSvgDataUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [avistrackLogoDataUrl, setAvistrackLogoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const posterRef = useRef<HTMLDivElement | null>(null);
  const exportPosterRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  const format = useMemo(
    () => PAGE_FORMATS.find((f) => f.id === pageFormatId)!,
    [pageFormatId],
  );

  const qrColor = useMemo(
    () => QR_COLORS.find((c) => c.id === qrColorId)!.value,
    [qrColorId],
  );

  /* Précache le logo AvisTrack */
  useEffect(() => {
    loadImageDataUrl(LOGO_AVISTRACK).then(setAvistrackLogoDataUrl);
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

  /* Générer le QR SVG et charger le logo entreprise */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const svg = await generateQrSvg(
          qrUrl,
          qrColorId === "green" ? ACCENT_GREEN : INK_BLACK,
        );
        if (cancelled) return;
        setQrSvgDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }

      if (companyLogoUrl) {
        try {
          const data = await loadImageDataUrl(companyLogoUrl);
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
  }, [qrUrl, qrColorId, companyLogoUrl]);

  /* Mesure du conteneur d'aperçu pour le scale */
  useEffect(() => {
    const el = posterRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setContainerWidth(w);
        setScale(w / format.logicalW);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [format.logicalW]);

  /* ---- Exports ---- */

  const downloadPng = useCallback(async () => {
    if (!exportPosterRef.current || !qrSvgDataUrl) return;
    setLoading(true);
    try {
      const node = exportPosterRef.current;
      const dataUrl = await toPng(node, {
        quality: 1,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: `${format.logicalW}px`,
          height: `${format.logicalH}px`,
        },
      });
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${slugify(companyName)}-${pageFormatId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export PNG");
    } finally {
      setLoading(false);
    }
  }, [exportPosterRef, qrSvgDataUrl, format, pageFormatId, companyName]);

  const downloadPdf = useCallback(async () => {
    if (!exportPosterRef.current || !qrSvgDataUrl) return;
    setLoading(true);
    try {
      const node = exportPosterRef.current;
      const dataUrl = await toPng(node, {
        quality: 1,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: `${format.logicalW}px`,
          height: `${format.logicalH}px`,
        },
      });
      const doc = new jsPDF({
        unit: "mm",
        format: [format.w, format.h] as [number, number],
      });
      const imgProps = doc.getImageProperties(dataUrl);
      const imgW = format.w;
      const imgH = (imgProps.height / imgProps.width) * imgW;
      doc.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
      doc.save(`qr-${slugify(companyName)}-${pageFormatId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export PDF");
    } finally {
      setLoading(false);
    }
  }, [exportPosterRef, qrSvgDataUrl, format, pageFormatId, companyName]);

  const downloadSvg = useCallback(() => {
    if (!qrSvgDataUrl) return;
    const blob = new Blob([atob(qrSvgDataUrl.split(",")[1]!)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slugify(companyName)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [qrSvgDataUrl, companyName]);

  /* ---- Rendu ---- */

  const posterProps = {
    logicalW: format.logicalW,
    logicalH: format.logicalH,
    companyName,
    avistrackLogoDataUrl: avistrackLogoDataUrl ?? LOGO_AVISTRACK,
    companyLogoDataUrl: logoDataUrl,
    qrSvgDataUrl: qrSvgDataUrl ?? "",
    qrColor,
  };

  const previewScaleStyle: CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    transformBox: "border-box",
    width: format.logicalW,
    height: format.logicalH,
  };

  const previewContainerStyle: CSSProperties = {
    width: "100%",
    maxWidth: "160mm",
    height: containerWidth > 0 ? containerWidth * (format.logicalH / format.logicalW) : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

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
              {pageFormatId} • {format.w} × {format.h} mm
            </span>
          </div>
          <div
            ref={posterRef}
            className="border border-black/20 bg-white overflow-hidden shadow-sm"
            style={previewContainerStyle}
          >
            {loading ? (
              <p className="text-sm text-gray-600">Génération de l&apos;affiche…</p>
            ) : qrSvgDataUrl ? (
              <div style={previewScaleStyle}>
                <QrPoster {...posterProps} />
              </div>
            ) : (
              <p className="text-sm text-gray-600">Préparation de l&apos;affiche…</p>
            )}
          </div>
        </div>

        {/* Version cachée pour les exports (taille logique, pas de scale) */}
        {qrSvgDataUrl && (
          <div
            ref={exportPosterRef}
            style={{
              position: "fixed",
              left: -9999,
              top: 0,
              width: format.logicalW,
              height: format.logicalH,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <QrPoster {...posterProps} />
          </div>
        )}

        {/* Contrôles */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-black/15 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-black">Format de page</h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Format de page">
              {PAGE_FORMATS.map((f) => {
                const active = f.id === pageFormatId;
                return (
                  <Button
                    key={f.id}
                    type="button"
                    onClick={() => setPageFormatId(f.id as "A6" | "A5" | "A4")}
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
                const active = qrColorId === c.id;
                return (
                  <Button
                    key={c.id}
                    type="button"
                    onClick={() => setQrColorId(c.id)}
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
            disabled={!qrSvgDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> SVG
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPng}
            disabled={loading || !qrSvgDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> PNG HD
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={downloadPdf}
            disabled={loading || !qrSvgDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> PDF {pageFormatId}
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
