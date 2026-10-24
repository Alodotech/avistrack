import type { MetadataRoute } from "next";
import { siteUrlOrFallback } from "@/lib/site-url";

/**
 * Règles d'exploration.
 *
 * Sont interdits : l'espace d'administration, les tableaux de bord
 * entreprise, les pages d'authentification et les API. Les formulaires
 * d'avis `/avis/<public_id>` sont également exclus : ce sont des pages à
 * usage unique, destinées à être ouvertes depuis un QR code.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrlOrFallback();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/login",
          "/onboarding",
          "/avis/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
