/**
 * URL publique canonique de l'application.
 *
 * Source de vérité unique : `NEXT_PUBLIC_SITE_URL`. Elle sert au QR code
 * (immuable une fois imprimé), au sitemap, au `robots.txt`, aux métadonnées
 * Open Graph et aux redirections OAuth. Deux valeurs différentes selon le
 * contexte signifieraient des QR codes pointant ailleurs que le site réel.
 */

/** Domaine de repli : utilisé seulement si la variable d'environnement manque. */
export const FALLBACK_SITE_URL = "https://avistrack.fr";

/** URL de développement par défaut. */
export const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * URL configurée, sans slash final. `null` si la variable est absente ou vide.
 */
function configuredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * URL canonique de l'application, sans slash final.
 *
 * En production, une variable manquante est une erreur de configuration : on
 * préfère faire échouer l'appel plutôt que de produire un QR code imprimé
 * pointant vers un domaine qui n'est pas le bon.
 */
export function siteUrl(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL doit être défini en production (voir .env.example).",
    );
  }
  return LOCAL_SITE_URL;
}

/**
 * Variante tolérante : ne lève jamais, pour les contextes de build (sitemap,
 * `robots.txt`, métadonnées) où l'absence de variable ne doit pas casser la
 * génération.
 */
export function siteUrlOrFallback(): string {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  return process.env.NODE_ENV === "production"
    ? FALLBACK_SITE_URL
    : LOCAL_SITE_URL;
}

/**
 * URL absolue d'une route interne.
 *
 * @param path Route interne, avec ou sans slash initial
 */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}/${path.replace(/^\/+/, "")}`;
}
