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
  DownloadIcon,
  QrIcon,
} from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/* Constantes DA AvisTrack                                            */
/* ------------------------------------------------------------------ */

const ACCENT_RED = "#d71920";
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
  { id: "red", label: "Rouge", value: ACCENT_RED },
  { id: "blue", label: "Bleu", value: "#1D4ED8" },
  { id: "green", label: "Vert", value: "#15803D" },
] as const;

const LINK_MODES = [
  { id: "official", label: "Lien officiel pré-rempli" },
  { id: "custom", label: "Coller un lien" },
] as const;

const MARGIN_PCT = 0.08; // 8% de chaque côté
const QR_WIDTH_PCT = 0.76;

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "entreprise";
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
  qrSvgDataUrl: string;
  qrColor: string;
};

/** Affiche QR à taille logique fixe, layout flex sans position absolue. */
function QrPoster({
  logicalW,
  logicalH,
  companyName,
  qrSvgDataUrl,
  qrColor,
}: QrPosterProps) {
  const margin = Math.round(logicalW * MARGIN_PCT);
  const contentW = logicalW - 2 * margin;
  const footerH = Math.round(logicalH * 0.12);
  const qrSize = Math.round(contentW * QR_WIDTH_PCT);
  const badgeBackground = qrColor === ACCENT_RED ? "#FFF1F1" : "#F2F2F2";

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

  const bodyStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: Math.round(logicalW * 0.05),
    padding: `0 ${margin}px`,
    boxSizing: "border-box",
  };

  const badgeStyle: CSSProperties = {
    borderRadius: 999,
    background: badgeBackground,
    color: qrColor,
    padding: `${Math.round(logicalW * 0.018)}px ${Math.round(logicalW * 0.04)}px`,
    fontSize: Math.round(logicalW * 0.026),
    fontWeight: 700,
    letterSpacing: "0.12em",
  };

  const titleStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.085),
    fontWeight: "800",
    textAlign: "center",
    margin: 0,
    color: INK_BLACK,
  };

  const qrContainerStyle: CSSProperties = {
    width: qrSize,
    height: qrSize,
    borderRadius: Math.round(qrSize * 0.09),
    border: `1px solid ${qrColor}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: WHITE,
    boxSizing: "border-box",
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.09)",
  };

  const qrImgStyle: CSSProperties = {
    width: "86%",
    height: "auto",
    display: "block",
  };

  const subtitleStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.042),
    color: "#444444",
    textAlign: "center",
    margin: 0,
    lineHeight: 1.4,
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
    borderTop: "1px solid #E5E7EB",
  };

  const companyNameStyle: CSSProperties = {
    fontSize: Math.round(logicalW * 0.06),
    fontWeight: "600",
    color: INK_BLACK,
    textAlign: "center",
    margin: 0,
  };

  return (
    <div style={posterStyle}>
      <main style={bodyStyle}>
        <span style={badgeStyle}>30 SECONDES POUR NOUS AIDER</span>
        <h1 style={titleStyle}>Votre avis compte !</h1>
        <div style={qrContainerStyle}>
          <img
            src={qrSvgDataUrl}
            alt="QR code de votre fiche d'avis"
            style={qrImgStyle}
          />
        </div>
        <p style={subtitleStyle}>
          Scannez pour partager votre expérience.
        </p>
      </main>

      <footer style={footerStyle}>
        <span style={companyNameStyle}>{companyName}</span>
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
};

export function QrStudio({
  url: officialUrl,
  companyName = "Mon entreprise",
}: QrStudioProps) {
  const [pageFormatId, setPageFormatId] = useState<"A6" | "A5" | "A4">("A6");
  const [qrColorId, setQrColorId] =
    useState<(typeof QR_COLORS)[number]["id"]>("red");
  const [linkMode, setLinkMode] = useState<"official" | "custom">("official");
  const [customLink, setCustomLink] = useState("");
  const [qrSvgDataUrl, setQrSvgDataUrl] = useState<string | null>(null);
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
        const svg = await generateQrSvg(qrUrl, qrColor);
        if (cancelled) return;
        setQrSvgDataUrl(`data:image/svg+xml;base64,${btoa(svg)}`);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [qrUrl, qrColor]);

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
    qrSvgDataUrl: qrSvgDataUrl ?? "",
    qrColor,
  };

  const previewScaleStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: format.logicalW,
    height: format.logicalH,
  };

  const previewContainerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: "160mm",
    height: containerWidth > 0 ? containerWidth * (format.logicalH / format.logicalW) : undefined,
    overflow: "hidden",
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <section
          aria-labelledby="qr-preview-heading"
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm xl:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-4 sm:px-6">
            <div>
              <h2 id="qr-preview-heading" className="text-base font-semibold text-black">
                Aperçu de votre affiche
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Le rendu se met à jour avec vos choix.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {pageFormatId} · {format.w} × {format.h} mm
            </span>
          </div>
          <div className="flex min-h-[30rem] items-center justify-center bg-gray-50 p-4 sm:p-8">
            <div
              ref={posterRef}
              className="overflow-hidden border border-black/15 bg-white shadow-xl shadow-black/10"
              style={previewContainerStyle}
            >
              {loading ? (
                <p className="p-6 text-sm text-gray-600">Génération de l&apos;affiche…</p>
              ) : qrSvgDataUrl ? (
                <div style={previewScaleStyle}>
                  <QrPoster {...posterProps} />
                </div>
              ) : (
                <p className="p-6 text-sm text-gray-600">Préparation de l&apos;affiche…</p>
              )}
            </div>
          </div>
        </section>

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

        <aside
          aria-labelledby="qr-settings-heading"
          className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm xl:col-span-4"
        >
          <div className="border-b border-black/10 px-5 py-4">
            <h2 id="qr-settings-heading" className="text-base font-semibold text-black">
              Personnaliser
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Choisissez le format, la couleur et le lien.
            </p>
          </div>
          <div className="flex flex-col gap-6 p-5">
            <section aria-labelledby="qr-format-heading">
              <h3 id="qr-format-heading" className="text-sm font-semibold text-black">
                <span className="mr-2 text-accent">01</span>Format papier
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Format de page">
                {PAGE_FORMATS.map((f) => {
                  const active = f.id === pageFormatId;
                  return (
                    <Button
                      key={f.id}
                      type="button"
                      onClick={() => setPageFormatId(f.id as "A6" | "A5" | "A4")}
                      variant={active ? "primary" : "secondary"}
                      className="h-auto min-h-[4.25rem] min-w-0 flex-col gap-1 px-2 py-2"
                      aria-pressed={active}
                    >
                      <span className="text-sm font-bold">{f.id}</span>
                      <span className="text-[10px] font-medium leading-tight">
                        {f.w} × {f.h} mm
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="qr-color-heading">
              <h3 id="qr-color-heading" className="text-sm font-semibold text-black">
                <span className="mr-2 text-accent">02</span>Couleur du QR code
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Couleur du QR">
                {QR_COLORS.map((c) => {
                  const active = qrColorId === c.id;
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      onClick={() => setQrColorId(c.id)}
                      variant={active ? "primary" : "secondary"}
                      aria-pressed={active}
                      className="justify-start px-2 text-xs sm:px-3"
                    >
                      <span
                        className="size-4 shrink-0 rounded-full border border-black/20"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="truncate">{c.label}</span>
                    </Button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="qr-link-heading">
              <h3 id="qr-link-heading" className="text-sm font-semibold text-black">
                <span className="mr-2 text-accent">03</span>Lien à encoder
              </h3>
              <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Mode de lien">
                {LINK_MODES.map((m) => {
                  const active = linkMode === m.id;
                  return (
                    <Button
                      key={m.id}
                      type="button"
                      onClick={() => setLinkMode(m.id)}
                      variant={active ? "primary" : "secondary"}
                      aria-pressed={active}
                      className="justify-start"
                    >
                      {m.label}
                    </Button>
                  );
                })}
              </div>
              {linkMode === "custom" ? (
                <div className="mt-3">
                  <label htmlFor="custom-link" className="mb-1 block text-xs font-semibold text-gray-600">
                    Votre lien
                  </label>
                  <input
                    id="custom-link"
                    type="url"
                    inputMode="url"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://exemple.com"
                    className="min-h-11 w-full rounded-md border border-black/30 bg-gray-50 px-3 text-sm text-black focus:border-accent focus:outline-none"
                  />
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                  Le lien officiel pointe toujours vers votre fiche d&apos;avis.
                </p>
              )}
            </section>
          </div>
        </aside>
      </div>

      {error ? (
        <div className="rounded-xl border border-red bg-red/5 p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      <section
        aria-labelledby="qr-download-heading"
        className="flex flex-col gap-4 rounded-xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="min-w-0">
          <h2 id="qr-download-heading" className="text-sm font-semibold text-black">
            Télécharger votre affiche
          </h2>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-gray-600">
            <QrIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{qrUrl}</span>
            <button
              type="button"
              className="shrink-0 font-semibold text-accent underline underline-offset-2"
              onClick={() => {
                void navigator.clipboard.writeText(qrUrl);
              }}
            >
              Copier le lien
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
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
            variant="primary"
            onClick={downloadPdf}
            disabled={loading || !qrSvgDataUrl}
            size="sm"
          >
            <DownloadIcon className="size-4" /> PDF {pageFormatId}
          </Button>
        </div>
      </section>
    </div>
  );
}
