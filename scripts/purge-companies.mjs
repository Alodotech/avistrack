#!/usr/bin/env node
/**
 * Purge des entreprises supprimées (RGPD) — T36.
 *
 * Appelle la fonction `purge_deleted_companies(retention_days)` définie dans
 * `supabase/migrations/003_security_and_purge.sql`. La purge est effectuée par
 * PostgreSQL (côté serveur), jamais par le client : le script ne fait que
 * déclencher l'appel avec la clé `service_role`.
 *
 * Usage :
 *   npm run db:purge            # 30 jours de rétention (défaut)
 *   npm run db:purge -- 15      # 15 jours de rétention
 *
 * Sur les déploiements où `pg_cron` est disponible, la purge tourne déjà
 * chaque jour à 03:17 UTC : ce script sert de filet de sécurité et de test.
 */

import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Charge les variables d'un fichier `.env*` sans écraser l'environnement.
 * Format Next.js : `CLE=valeur`, guillemets optionnels, `#` pour les commentaires.
 */
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseRetentionDays(argv) {
  const raw = argv.find((arg) => /^\d+$/.test(arg));
  if (!raw) return 30;
  const days = Number.parseInt(raw, 10);
  if (days < 0) {
    throw new Error("La rétention doit être un entier positif ou nul.");
  }
  return days;
}

async function main() {
  loadEnvFile(resolve(ROOT, ".env.local"));
  loadEnvFile(resolve(ROOT, ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Renseignez-les dans .env.local (voir .env.example).",
    );
    process.exitCode = 1;
    return;
  }

  const retentionDays = parseRetentionDays(process.argv.slice(2));

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc("purge_deleted_companies", {
    p_retention_days: retentionDays,
  });

  if (error) {
    console.error(
      "Échec de la purge. Vérifiez que la migration 003 est appliquée sur la base.",
    );
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const purged = typeof data === "number" ? data : 0;
  console.log(
    `Purge terminée : ${purged} entreprise(s) supprimée(s) définitivement (rétention ${retentionDays} j).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
