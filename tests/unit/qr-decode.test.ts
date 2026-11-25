import { describe, expect, it } from "vitest";
import qrcode from "qrcode-generator";
import jsQR from "jsqr";

/** Génère une ImageData (Uint8ClampedArray RGBA) d'un QR code. */
function qrImageData(url: string, size = 512): ImageData {
  const code = qrcode(0, "H");
  code.addData(url);
  code.make();

  const moduleCount = code.getModuleCount();
  const quiet = 4;
  const total = moduleCount + 2 * quiet;
  const pixel = size / total;

  const data = new Uint8ClampedArray(size * size * 4);
  /* Fond blanc */
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!code.isDark(row, col)) continue;
      const x0 = Math.round((col + quiet) * pixel);
      const x1 = Math.round((col + quiet + 1) * pixel);
      const y0 = Math.round((row + quiet) * pixel);
      const y1 = Math.round((row + quiet + 1) * pixel);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const idx = (y * size + x) * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }
  }

  return { data, width: size, height: size, colorSpace: "srgb" as const };
}

describe("QR code décodage", () => {
  it("décode correctement l'URL encodée avec correction d'erreur H", () => {
    const url = "https://utlkicxrvfentrdczpna.supabase.co/avis/abc123def456";
    const image = qrImageData(url);
    const decoded = jsQR(image.data, image.width, image.height);

    expect(decoded).not.toBeNull();
    expect(decoded!.data).toBe(url);
  });

  it("décode une URL courte", () => {
    const url = "https://avis.moncommerce.fr/qr";
    const image = qrImageData(url);
    const decoded = jsQR(image.data, image.width, image.height);

    expect(decoded).not.toBeNull();
    expect(decoded!.data).toBe(url);
  });
});
