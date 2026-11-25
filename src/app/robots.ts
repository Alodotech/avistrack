import type { MetadataRoute } from "next";
import { siteUrlOrFallback } from "@/lib/site-url";

/**
 * Règles d'exploration.
 *
 * Les espaces privés et formulaires d'avis portent une directive `noindex`
 * pour que les moteurs puissent la lire. Seules les API sont bloquées ici.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrlOrFallback();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
