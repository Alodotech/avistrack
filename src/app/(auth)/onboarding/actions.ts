"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { absoluteUrl } from "@/lib/site-url";
import { createCompany } from "@/server/repositories/company-repository";
import { createClient } from "@/utils/supabase/server";

export type OnboardingState = {
  status: "idle" | "error";
  message?: string;
  errors?: { name?: string; email?: string; phone?: string; password?: string };
};

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  email: z.email("Adresse e-mail invalide."),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^\+[1-9]\d{7,14}$/,
          "Indiquez le numéro au format international, par exemple +22901970000.",
        ),
    ),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères."),
});

export async function createAccount(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: {
        name: fields.name?.[0],
        email: fields.email?.[0],
        phone: fields.phone?.[0],
        password: fields.password?.[0],
      },
    };
  }

  const { name, email, phone, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
      emailRedirectTo: absoluteUrl("/auth/callback"),
    },
  });
  if (error || !data.user) {
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: { email: "Un compte existe déjà avec cette adresse e-mail." },
    };
  }

  // Création immédiate de la fiche entreprise, rattachée au compte.
  const result = await createCompany({
    userId: data.user.id,
    name,
    email,
    phone,
  });
  if (!result.ok) {
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: { email: "Un compte existe déjà avec cette adresse e-mail." },
    };
  }

  // Si la confirmation d'e-mail est activée, aucune session n'est ouverte :
  // l'utilisateur est invité à confirmer son adresse.
  if (!data.session) {
    return {
      status: "error",
      message: `Compte créé. Confirmez votre adresse en cliquant sur le lien envoyé à ${email}.`,
    };
  }

  redirect("/dashboard");
}
