"use client";

/**
 * Filet de sécurité dernier recours : il n'a pas accès au layout racine, il
 * doit donc rendre sa propre page HTML complète.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f4f4",
          color: "#0a0a0a",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0 }}>
            Une erreur est survenue
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#555555" }}>
            L&apos;application n&apos;a pas pu démarrer. Rechargez la page ; si
            le problème persiste, contactez l&apos;équipe AvisTrack.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#555555" }}>
              Référence de l&apos;erreur : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "9999px",
              border: "none",
              background: "#d71920",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
