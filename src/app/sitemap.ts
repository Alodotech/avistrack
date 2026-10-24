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
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrlOrFallback();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
