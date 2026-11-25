/**
 * URL publique canonique de l'application.
 *
 * Domaine canonique de production : il sert aux QR codes (immuables une fois
 * imprimés), au sitemap, à `robots.txt` et aux métadonnées SEO.
 */

/** Domaine canonique public : le domaine Vercel ne doit pas être indexé. */
export const FALLBACK_SITE_URL = "https://www.avistrack.org";

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
 */
export function siteUrl(): string {
  return process.env.NODE_ENV === "production"
    ? FALLBACK_SITE_URL
    : (configuredSiteUrl() ?? LOCAL_SITE_URL);
}

/**
 * En production, retourne toujours le domaine canonique plutôt que l'URL
 * automatique de déploiement Vercel. En local, respecte la configuration.
 */
export function siteUrlOrFallback(): string {
  return siteUrl();
}

/**
 * URL absolue d'une route interne.
 *
 * @param path Route interne, avec ou sans slash initial
 */
export function absoluteUrl(path: string): string {
  return `${siteUrl()}/${path.replace(/^\/+/, "")}`;
}
