"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Déconnexion explicite (T35).
 *
 * La session Supabase est fermée côté serveur, puis le visiteur est renvoyé
 * vers la page de connexion de son espace. L'action est distincte pour chaque
 * espace : un administrateur revient à `/admin/login`, une entreprise à
 * `/login`.
 */

export async function signOutCompany(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
