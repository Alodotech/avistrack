import "server-only";
import type { Admin } from "@/server/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Accès aux comptes administrateur. L'identité est le compte Supabase Auth
 * (`user_id`) : un administrateur ne peut lire que sa propre ligne via RLS.
 */

function toAdmin(row: { user_id: string; email: string }): Admin {
  return { id: row.user_id, email: row.email };
}

/** Vérifie qu'un compte authentifié est administrateur. */
export async function findAdminById(id: string): Promise<Admin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id, email")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toAdmin(data) : null;
}

export const findAdminByUserId = findAdminById;

/**
 * Recherche par e-mail, réservée au serveur : sert aux outils d'administration
 * (les politiques RLS interdisent la recherche pré-authentification).
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id, email")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? toAdmin(data) : null;
}
