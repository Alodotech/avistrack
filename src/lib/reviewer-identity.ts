import { z } from "zod";
import { normalizeFeexPayPhoneNumber } from "@/lib/feexpay";
import { sanitizeText } from "@/lib/sanitize";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Indiquez au moins 2 caractères.")
  .max(80, "Le nom ne peut pas dépasser 80 caractères.");

const emailSchema = z
  .string()
  .trim()
  .max(254, "L'adresse e-mail est trop longue.")
  .email("Indiquez une adresse e-mail valide.");

export type ReviewerIdentityInput = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phone: string;
  email: string;
};

export type ReviewerIdentity = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type ReviewerIdentityResult =
  | { success: true; data: ReviewerIdentity }
  | { success: false; errors: Record<string, string> };

export function validateReviewerIdentity(
  input: ReviewerIdentityInput,
): ReviewerIdentityResult {
  const firstName = nameSchema.safeParse(input.firstName);
  const lastName = nameSchema.safeParse(input.lastName);
  const email = emailSchema.safeParse(input.email);
  const phone = normalizeFeexPayPhoneNumber(input.phone, input.countryCode);
  const errors: Record<string, string> = {};

  if (!firstName.success) {
    errors.reviewerFirstName =
      firstName.error.issues[0]?.message ?? "Indiquez votre prénom.";
  }
  if (!lastName.success) {
    errors.reviewerLastName =
      lastName.error.issues[0]?.message ?? "Indiquez votre nom.";
  }
  if (!phone) {
    errors.reviewerPhone =
      "Indiquez un numéro valide pour le pays sélectionné.";
  }
  if (!email.success) {
    errors.reviewerEmail =
      email.error.issues[0]?.message ?? "Indiquez une adresse e-mail valide.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  if (!firstName.success || !lastName.success || !phone || !email.success) {
    throw new Error("La validation des coordonnées du répondant est incohérente.");
  }

  return {
    success: true,
    data: {
      firstName: sanitizeText(firstName.data, 80),
      lastName: sanitizeText(lastName.data, 80),
      phone: `+${phone}`,
      email: email.data.toLowerCase(),
    },
  };
}
