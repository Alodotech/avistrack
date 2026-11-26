import type { MetadataRoute } from "next";
import { siteUrlOrFallback } from "@/lib/site-url";

/**
 * Routes publiques indexables.
 *
 * Les surfaces privées (`/dashboard`, `/admin`, `/login`, `/onboarding`) et
 * les formulaires d'avis (`/avis/<public_id>`) sont exclus : elles n'apportent
 * rien au référencement et n'ont pas vocation à être explorées.
 */
const PUBLIC_ROUTES = [
  "",
  "/tarifs",
  "/conditions-generales",
  "/mentions-legales",
  "/confidentialite",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrlOrFallback();

  return PUBLIC_ROUTES.map((path) => ({ url: `${base}${path}` }));
}
