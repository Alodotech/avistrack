"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSingleRatingQuestion, MAX_FORM_QUESTIONS } from "@/lib/review-form";
import { COMPANY_LOGIN_PATH, getCurrentCompany } from "@/server/auth/guards";
import { QUESTION_TYPES } from "@/server/domain";
import { updateReviewFormConfig } from "@/server/repositories/form-repository";

const questionsSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1, "Identifiant de question manquant.").max(40),
      type: z.enum(QUESTION_TYPES),
      label: z
        .string()
        .trim()
        .min(2, "Chaque question doit contenir au moins 2 caractères.")
        .max(140, "Une question ne peut pas dépasser 140 caractères."),
      required: z.boolean(),
    }),
  )
  .min(1, "Le formulaire doit contenir au moins une question.")
  .max(MAX_FORM_QUESTIONS, `Le formulaire ne peut pas dépasser ${MAX_FORM_QUESTIONS} questions.`);

const formConfigSchema = z.object({
  questions: questionsSchema,
  thanksTitle: z
    .string()
    .trim()
    .min(2, "Le titre doit contenir au moins 2 caractères.")
    .max(80, "Le titre ne peut pas dépasser 80 caractères."),
  thanksMessage: z
    .string()
    .trim()
    .min(2, "Le message doit contenir au moins 2 caractères.")
    .max(240, "Le message ne peut pas dépasser 240 caractères."),
});

export type FormStudioState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: {
    questions?: string;
    thanksTitle?: string;
    thanksMessage?: string;
  };
};

function parseQuestions(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveFormConfig(
  _previous: FormStudioState,
  formData: FormData,
): Promise<FormStudioState> {
  // Une Server Action est joignable par un POST direct : elle se réautorise elle-même.
  const company = await getCurrentCompany();
  if (!company) redirect(COMPANY_LOGIN_PATH);
  if (company.status !== "ACTIVE") {
    return { status: "error", message: "Votre compte n'est pas actif." };
  }

  const parsed = formConfigSchema.safeParse({
    questions: parseQuestions(formData.get("questions")),
    thanksTitle: formData.get("thanksTitle"),
    thanksMessage: formData.get("thanksMessage"),
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: {
        questions: fields.questions?.[0],
        thanksTitle: fields.thanksTitle?.[0],
        thanksMessage: fields.thanksMessage?.[0],
      },
    };
  }

  if (!hasSingleRatingQuestion(parsed.data.questions)) {
    return {
      status: "error",
      message: "Corrigez les champs signalés.",
      errors: {
        questions:
          "Le formulaire doit contenir exactement une question de note (étoiles).",
      },
    };
  }

  await updateReviewFormConfig(company.id, parsed.data);
  refresh();
  return { status: "saved", message: "Formulaire enregistré." };
}
