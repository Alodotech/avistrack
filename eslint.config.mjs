import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Le jeu de données de développement ne se lit qu'à travers les repositories.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/repositories/**", "src/server/dev/**", "src/app/dev/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/dev/*"],
              message:
                "Passez par un repository (src/server/repositories) : aucun accès direct aux données.",
            },
          ],
        },
      ],
    },
  },
  {
    // AD-05 : l'espace Admin n'affiche que des agrégats, jamais le contenu des avis.
    files: ["src/app/(admin)/**/*.{ts,tsx}", "src/components/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/repositories/review-repository", "@/server/dev/*"],
              message:
                "L'espace Admin ne lit pas les avis : utilisez les agrégats de company-repository.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
