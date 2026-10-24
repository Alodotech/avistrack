"use server";

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/guards";
import { createClient } from "@/utils/supabase/server";

export type AdminLoginState = { status: "idle" | "error"; message?: string };

export async function signInAdmin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return {
      status: "error",
      message: "Renseignez votre e-mail et votre mot de passe.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: "error",
      message: "E-mail ou mot de passe incorrect.",
    };
  }

  // Réservé aux comptes listés dans la table `admins` (T30).
  const admin = await getCurrentAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Ce compte n'a pas les droits d'administration.",
    };
  }

  redirect("/admin");
}
