"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  COMPANY_LOGIN_PATH,
  getCurrentCompany,
  requireCompany,
} from "@/server/auth/guards";
import { signOutCompany } from "@/server/auth/sign-out";
import { uploadCompanyLogo } from "@/server/repositories/company-logo-repository";
import {
  deleteOwnCompany,
  updateCompanyProfile,
} from "@/server/repositories/company-repository";

const profileSchema = z.object({
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

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: { name?: string; phone?: string; email?: string; logo?: string };
};

export async function updateProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const company = await getCurrentCompany();
  if (!company) redirect(COMPANY_LOGIN_PATH);
  if (company.status !== "ACTIVE") {
    return { status: "error", message: "Votre compte n'est pas actif." };
  }

  const parsed = profileSchema.safeParse({
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

  await updateCompanyProfile(company.id, { ...parsed.data, logoUrl });
  refresh();
  return { status: "saved", message: "Profil mis à jour." };
}

export type DeleteAccountResult = { ok: boolean; message?: string };

/**
 * Suppression du compte par le propriétaire.
 *
 * La double confirmation est exigée côté serveur : le client doit renvoyer
 * exactement « SUPPRIMER », une requête forgée ne suffit donc pas.
 */
export async function deleteAccountAction(
  confirmation: string,
): Promise<DeleteAccountResult> {
  const company = await requireCompany({ allowExpired: true, allowOnboarding: true });

  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") {
    return {
      ok: false,
      message: "Saisissez SUPPRIMER pour confirmer la suppression du compte.",
    };
  }

  const deleted = await deleteOwnCompany(company.id);
  if (!deleted) {
    return { ok: false, message: "Ce compte est déjà supprimé." };
  }

  await signOutCompany();
  return { ok: true };
}
