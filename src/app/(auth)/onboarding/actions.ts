"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COMPANY_COOKIE } from "@/server/auth/session";
import { createCompany } from "@/server/repositories/company-repository";

export type OnboardingState = {
  status: "idle" | "error";
  message?: string;
  errors?: { name?: string; email?: string; phone?: string };
};

const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;

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
});

export async function createAccount(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  if (process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "La création de compte sera disponible prochainement.",
    };
  }

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
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
      },
    };
  }

  const result = await createCompany(parsed.data);
  if (!result.ok) {
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: { email: "Un compte existe déjà avec cette adresse e-mail." },
    };
  }

  (await cookies()).set(DEV_COMPANY_COOKIE, result.company.id, cookieOptions);
  redirect("/dashboard");
}
