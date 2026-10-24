import type { Database } from "@/types/supabase";

/** URL du projet Supabase, partagée client/serveur. */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est manquant : renseignez .env.local (voir .env.example).",
    );
  }
  return url;
}

/** Clé publique anonyme, exposable au navigateur. */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant : renseignez .env.local (voir .env.example).",
    );
  }
  return key;
}

export type { Database };
