import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lecture de `.env.local` pour les suites d'intégration.
 *
 * Vite n'expose pas `.env.local` en mode `test` : on le lit nous-mêmes, sans
 * dépendance supplémentaire. Les variables déjà présentes dans `process.env`
 * l'emportent (CI, surcharges manuelles).
 */
function parseEnvFile(path: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return {};
  }

  const values: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function localEnv(): Record<string, string | undefined> {
  const file = parseEnvFile(resolve(process.cwd(), ".env.local"));
  return { ...file, ...process.env };
}
