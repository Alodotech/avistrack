"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COMPANY_LOGIN_PATH, getCurrentCompany } from "@/server/auth/guards";
import { updateCompanyProfile } from "@/server/repositories/company-repository";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(120, "Le nom ne peut pas dépasser 120 caractères."),
  phone: z
    .string()
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

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: { name?: string; phone?: string };
};

export async function updateProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  // Une Server Action est joignable par un POST direct : elle se réautorise elle-même.
  const company = await getCurrentCompany();
  if (!company) redirect(COMPANY_LOGIN_PATH);
  if (company.status !== "ACTIVE") {
    return { status: "error", message: "Votre compte n'est pas actif." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: { name: fields.name?.[0], phone: fields.phone?.[0] },
    };
  }

  await updateCompanyProfile(company.id, parsed.data);
  refresh();
  return { status: "saved", message: "Profil mis à jour." };
}
