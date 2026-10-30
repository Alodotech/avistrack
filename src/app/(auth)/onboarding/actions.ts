"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { LOGO_REQUIRED } from "@/lib/company-status";
import {
  COMPANY_LOGIN_PATH,
  getCurrentCompany,
} from "@/server/auth/guards";
import { uploadCompanyLogo } from "@/server/repositories/company-logo-repository";
import { updateCompanyProfile } from "@/server/repositories/company-repository";

export type OnboardingState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: { name?: string; phone?: string; email?: string; logo?: string };
};

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indiquez le nom de votre entreprise.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
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
  email: z.string().trim().email("Adresse e-mail invalide"),
});

export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const company = await getCurrentCompany();
  if (!company) redirect(COMPANY_LOGIN_PATH);
  if (company.status !== "ACTIVE") {
    return { status: "error", message: "Votre compte n'est pas actif." };
  }

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: {
        name: fields.name?.[0],
        phone: fields.phone?.[0],
        email: fields.email?.[0],
      },
    };
  }

  let logoUrl: string | null | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const uploaded = await uploadCompanyLogo(company.id, logo);
    if (!uploaded.ok) {
      return {
        status: "error",
        message: uploaded.message,
        errors: { logo: uploaded.message },
      };
    }
    logoUrl = uploaded.url;
  }

  // Le caractère obligatoire du logo se règle par `LOGO_REQUIRED` : la
  // validation serveur suit la même règle que le libellé du formulaire.
  if (LOGO_REQUIRED && !company.logoUrl && !logoUrl) {
    const message = "Le logo de votre entreprise est obligatoire.";
    return { status: "error", message, errors: { logo: message } };
  }

  await updateCompanyProfile(company.id, { ...parsed.data, logoUrl });
  return { status: "saved", message: "Profil enregistré. Choisissez votre forfait." };
}
