import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, type Database } from "./env";

/**
 * Client Supabase côté serveur (T07) : Server Components, Server Actions et
 * Route Handlers. La session est lue depuis les cookies ; un nouveau client
 * doit être créé à chaque requête (jamais partagé entre requêtes).
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : l'écriture de cookie y est
            // interdite. Le rafraîchissement de session est assuré par le proxy.
          }
        },
      },
    },
  );
}
