import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Le client à privilèges (`service_role`) contourne les politiques RLS :
    // il ne s'utilise que dans la couche d'accès aux données.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/repositories/**", "src/utils/supabase/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/utils/supabase/admin"],
              message:
                "Client service_role réservé aux repositories : passez par src/server/repositories.",
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
              group: ["@/server/repositories/review-repository"],
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
