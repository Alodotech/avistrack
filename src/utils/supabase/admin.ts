import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, type Database } from "./env";

/**
 * Client Supabase à privilèges (`service_role`) : il contourne les politiques
 * RLS. Réservé aux opérations serveur strictement contrôlées (administration
 * plateforme, dépôt d'avis public). Ne jamais l'exposer au navigateur.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY est manquant : renseignez .env.local (voir .env.example).",
    );
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
