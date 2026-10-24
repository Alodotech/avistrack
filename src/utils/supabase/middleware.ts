import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, type Database } from "./env";

/**
 * Rafraîchit la session Supabase au passage de chaque requête (T07/T15).
 *
 * Doit être appelé depuis le proxy : il écrit les cookies de session rafraîchis
 * à la fois sur la requête (pour la rendre visible en aval) et sur la réponse
 * (pour le navigateur). Sans cet appel, les sessions expirent silencieusement.
 */
export async function updateSession(request: NextRequest): Promise<{
  supabase: SupabaseClient<Database>;
  response: NextResponse;
}> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Déclenche le rafraîchissement : ne pas retirer cet appel.
  await supabase.auth.getUser();

  return { supabase, response };
}
