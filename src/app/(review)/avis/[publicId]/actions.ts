"use server";

import { findCompanyByPublicId } from "@/server/repositories/company-repository";
import { getReviewFormConfig } from "@/server/repositories/form-repository";
import { createReview } from "@/server/repositories/review-repository";
import type { Rating } from "@/server/domain";

export type PublicReviewState = {
  status: "idle" | "submitted" | "error";
  message?: string;
  errors?: Record<string, string>;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function submitReview(
  _previous: PublicReviewState,
  formData: FormData,
): Promise<PublicReviewState> {
  const publicId = String(formData.get("publicId") ?? "");
  const company = await findCompanyByPublicId(publicId);
  if (!company || company.status !== "ACTIVE") {
    return {
      status: "error",
      message: "Ce formulaire d'avis n'est plus disponible.",
    };
  }

  // Les questions sont relues côté serveur : le client ne peut pas en inventer.
  const config = await getReviewFormConfig(company.id);
  const errors: Record<string, string> = {};
  const answers: Record<string, string> = {};
  let rating: Rating | null = null;
  let visitDate = todayIso();
  let comment: string | null = null;

  for (const question of config.questions) {
    const raw = formData.get(question.id);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (question.type === "rating") {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
        rating = parsed as Rating;
      } else {
        errors[question.id] = "Merci de choisir une note.";
      }
      continue;
    }

    if (!value && question.required) {
      errors[question.id] = "Ce champ est obligatoire.";
      continue;
    }
    if (!value) continue;

    answers[question.id] = value;
    if (question.type === "date") {
      visitDate = value;
    } else if (comment === null) {
      comment = value;
    }
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

  return { status: "submitted" };
}
