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
