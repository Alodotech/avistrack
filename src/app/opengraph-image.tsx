import { ImageResponse } from "next/og";

export const alt =
  "AvisTrack — Collectez et analysez les avis clients par QR code";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px",
        background: "#0a0a0a",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 99,
              background: "#d71920",
            }}
          />
          AvisTrack
        </div>
        <h1
          style={{
            marginTop: 72,
            marginBottom: 0,
            fontSize: 68,
            lineHeight: 1.08,
            letterSpacing: -2,
          }}
        >
          Des avis clients.
          <br />
          Un seul scan.
        </h1>
        <p style={{ marginTop: 28, color: "#c5c5c5", fontSize: 25 }}>
          Collectez et analysez les avis de vos clients.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          width: 250,
          height: 250,
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #d71920",
          borderRadius: 36,
          color: "#d71920",
          fontSize: 84,
          fontWeight: 700,
        }}
      >
        A
      </div>
    </div>,
    size,
  );
}
