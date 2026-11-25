"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, type Database } from "./env";

/**
 * Client Supabase côté navigateur (T07) : connexion OAuth, écoute des
 * changements de session. Instancié une seule fois par onglet.
 */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
}
