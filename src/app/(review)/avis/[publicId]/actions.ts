"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
import { findPublicCompanyByPublicId } from "@/server/repositories/company-repository";
import { getPublicReviewFormConfig } from "@/server/repositories/form-repository";
import { createReview } from "@/server/repositories/review-repository";
import type { Rating } from "@/server/domain";

export type PublicReviewState = {
  status: "idle" | "submitted" | "error";
  message?: string;
  errors?: Record<string, string>;
};

/** Cookie de limitation : une soumission par entreprise et par fenêtre de 5 min. */
const LIMIT_COOKIE = "avistrack_review_limit";
const LIMIT_WINDOW_MS = 5 * 60 * 1000;

/** Longueur maximale d'une réponse libre. */
const MAX_ANSWER_LENGTH = 2000;

const ratingSchema = z.coerce
  .number()
  .int("La note doit être un nombre entier.")
  .min(1, "Merci de choisir une note.")
  .max(5, "La note doit être comprise entre 1 et 5.");

const textSchema = z
  .string()
  .max(MAX_ANSWER_LENGTH, "Votre réponse est trop longue.");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    "La date de visite ne peut pas être dans le futur.",
  );

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fenêtre anti-spam : lit l'horodatage de la dernière soumission. */
function readLastSubmission(raw: string | undefined, companyId: string): number {
  if (!raw) return 0;
  const [storedTs, storedCompanyId] = raw.split("|");
  if (storedCompanyId !== companyId) return 0;
  const timestamp = Number.parseInt(storedTs, 10);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function submitReview(
  _previous: PublicReviewState,
  formData: FormData,
): Promise<PublicReviewState> {
  const publicId = decodeURIComponent(
    String(formData.get("publicId") ?? ""),
  ).trim();
  const company = await findPublicCompanyByPublicId(publicId);
  if (!company || company.status !== "ACTIVE") {
    return {
      status: "error",
      message: "Ce formulaire d'avis n'est plus disponible.",
    };
  }

  // Anti-spam : une soumission par entreprise et par fenêtre de 5 minutes.
  const cookieStore = await cookies();
  const lastSubmission = readLastSubmission(
    cookieStore.get(LIMIT_COOKIE)?.value,
    company.id,
  );
  if (lastSubmission > 0 && Date.now() - lastSubmission < LIMIT_WINDOW_MS) {
    return {
      status: "error",
      message:
        "Vous avez déjà soumis un avis récemment. Merci de patienter 5 minutes avant une nouvelle soumission.",
    };
  }

  // Les questions sont relues côté serveur : le client ne peut pas en inventer.
  const config = await getPublicReviewFormConfig(publicId);
  const errors: Record<string, string> = {};
  const answers: Record<string, string> = {};
  let rating: Rating | null = null;
  let visitDate = todayIso();
  let comment: string | null = null;

  for (const question of config.questions) {
    const raw = formData.get(question.id);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (question.type === "rating") {
      const parsed = ratingSchema.safeParse(value);
      if (!parsed.success) {
        errors[question.id] = parsed.error.issues[0]?.message ?? "Note invalide.";
        continue;
      }
      rating = parsed.data as Rating;
      continue;
    }

    if (!value && question.required) {
      errors[question.id] = "Ce champ est obligatoire.";
      continue;
    }
    if (!value) continue;

    if (question.type === "date") {
      const parsed = dateSchema.safeParse(value);
      if (!parsed.success) {
        errors[question.id] =
          parsed.error.issues[0]?.message ?? "Date invalide.";
        continue;
      }
      answers[question.id] = parsed.data;
      visitDate = parsed.data;
      continue;
    }

    const parsed = textSchema.safeParse(value);
    if (!parsed.success) {
      errors[question.id] =
        parsed.error.issues[0]?.message ?? "Réponse invalide.";
      continue;
    }
    // Le texte est nettoyé avant d'être stocké (T23).
    const clean = sanitizeText(parsed.data, MAX_ANSWER_LENGTH);
    answers[question.id] = clean;
    if (comment === null) comment = clean;
  }

  if (rating === null) {
    const ratingQuestion = config.questions.find(
      (question) => question.type === "rating",
    );
    errors[ratingQuestion?.id ?? "rating"] = "Merci de choisir une note.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Corrigez les champs signalés.", errors };
  }

  if (rating === null) {
    return { status: "error", message: "Merci de choisir une note." };
  }

  await createReview({
    id: globalThis.crypto.randomUUID(),
    companyId: company.id,
    rating,
    comment,
    visitDate,
    createdAt: new Date(),
    answers,
  });

  // La limitation n'est posée qu'après une soumission acceptée : un formulaire
  // mal rempli ne bloque pas l'utilisateur. Le cookie vaut pour tout le site,
  // et non pour un chemin inexistant. Il est `httpOnly` : le navigateur n'a
  // aucun besoin de le lire, seul le serveur s'en sert.
  cookieStore.set(LIMIT_COOKIE, `${Date.now()}|${company.id}`, {
    maxAge: LIMIT_WINDOW_MS / 1000,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return { status: "submitted" };
}
