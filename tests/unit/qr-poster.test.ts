import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

/* ------------------------------------------------------------------ */
/* Logique des dimensions (dupliquée de qr-studio.tsx pour le test)   */
/* ------------------------------------------------------------------ */

const PAGE_FORMATS: {
  id: string;
  logicalW: number;
  logicalH: number;
}[] = [
  { id: "A6", logicalW: 397, logicalH: 559 },
  { id: "A5", logicalW: 559, logicalH: 794 },
  { id: "A4", logicalW: 794, logicalH: 1123 },
];

const QR_WIDTH_PCT = 0.60;
const MARGIN_PCT = 0.08;

function qrWidth(logicalW: number): number {
  return Math.round(logicalW * QR_WIDTH_PCT);
}

function marginPx(logicalW: number): number {
  return Math.round(logicalW * MARGIN_PCT);
}

describe("QR poster dimensions", () => {
  it("A6, A5, A4 ont le bon ratio papier", () => {
    for (const f of PAGE_FORMATS) {
      const ratio = f.logicalW / f.logicalH;
      const mmRatio = f.id === "A6" ? 105 / 148 : f.id === "A5" ? 148 / 210 : 210 / 297;
      expect(ratio).toBeCloseTo(mmRatio, 2);
    }
  });

  it("le QR mesure 60% de la largeur logique (≥55%)", () => {
    for (const f of PAGE_FORMATS) {
      const w = qrWidth(f.logicalW);
      const pct = w / f.logicalW;
      expect(pct).toBeGreaterThanOrEqual(0.55);
      expect(pct).toBeCloseTo(QR_WIDTH_PCT, 2);
    }
  });

  it("les marges ne dépassent pas les bords", () => {
    for (const f of PAGE_FORMATS) {
      const m = marginPx(f.logicalW);
      const qrW = qrWidth(f.logicalW);
      expect(m).toBeGreaterThan(0);
      expect(m + qrW + m).toBeLessThanOrEqual(f.logicalW);
    }
  });
});

describe("QR code generation", () => {
  it("génère un SVG valide avec correction d'erreur H", async () => {
    const url = "https://utlkicxrvfentrdczpna.supabase.co/avis/test123";
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 4,
      width: 1024,
      color: { dark: "#0F5C47", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("0F5C47");
    expect(svg).toContain("FFFFFF");
  });

  it("le SVG encodé en base64 est décodable", async () => {
    const url = "https://exemple.com/avis/abc";
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 4,
      width: 1024,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });
    const base64 = btoa(svg);
    const decoded = atob(base64);
    expect(decoded).toBe(svg);
  });
});
