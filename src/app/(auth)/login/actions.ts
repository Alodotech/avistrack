"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type LoginState = { status: "idle" | "error"; message?: string };

export async function signInCompany(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
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

  redirect("/dashboard");
}
