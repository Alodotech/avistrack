import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

/**
 * Identité authentifiée de la requête (T02).
 *
 * La session est portée par les cookies Supabase Auth, posés et rafraîchis par
 * le proxy (voir `src/proxy.ts`). Les espaces entreprise et administration
 * partagent ce compte : leur distinction se fait par la table à laquelle il est
 * rattaché (`companies` ou `admins`), résolue dans `guards.ts`.
 */

export type AuthUser = {
  id: string;
  email: string | null;
};

/**
 * Utilisateur Supabase de la requête, ou `null` sans session valide.
 * Mémoïsé pour la durée de la requête (une seule validation de token).
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});
