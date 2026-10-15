import {
  MAX_FORM_QUESTIONS,
  QUESTION_TYPES,
  type QuestionType,
  type ReviewFormConfig,
  type ReviewFormQuestion,
} from "@/server/domain";

export { MAX_FORM_QUESTIONS };

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  rating: "Note (étoiles)",
  text: "Réponse libre",
  date: "Date de la visite",
};

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  rating: "Le client choisit une note de 1 à 5 étoiles.",
  text: "Le client écrit sa réponse dans un champ libre.",
  date: "Le client indique la date de sa visite.",
};

/** Identifiant court et lisible pour une question créée dans le studio. */
export function newQuestionId(): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `q_${suffix}`;
}

export function isQuestionType(value: unknown): value is QuestionType {
  return (QUESTION_TYPES as readonly unknown[]).includes(value);
}

/**
 * Contenu par défaut du formulaire d'avis : un socle de trois questions qui
 * correspond au parcours historique (note, commentaire, date de visite).
 */
export const DEFAULT_REVIEW_FORM_CONFIG: ReviewFormConfig = {
  questions: [
    {
      id: "rating",
      type: "rating",
      label: "Comment s'est passée votre visite ?",
      required: true,
    },
    {
      id: "comment",
      type: "text",
      label: "Votre commentaire",
      required: false,
    },
    {
      id: "visit",
      type: "date",
      label: "Date de votre visite",
      required: false,
    },
  ],
  thanksTitle: "Merci pour votre avis !",
  thanksMessage:
    "Votre retour aide le commerce à mieux vous accueillir la prochaine fois.",
};

function sanitizeQuestions(
  questions: readonly ReviewFormQuestion[] | undefined,
): ReviewFormQuestion[] {
  const clean = (questions ?? []).filter(
    (question) =>
      question &&
      typeof question.id === "string" &&
      question.id.length > 0 &&
      isQuestionType(question.type) &&
      typeof question.label === "string" &&
      question.label.length > 0,
  );
  const limited = clean.slice(0, MAX_FORM_QUESTIONS);
  return limited.length > 0 ? limited : DEFAULT_REVIEW_FORM_CONFIG.questions;
}

/** Complète une configuration partielle avec les valeurs par défaut. */
export function withFormDefaults(
  config: Partial<ReviewFormConfig> | null | undefined,
): ReviewFormConfig {
  return {
    questions: sanitizeQuestions(config?.questions),
    thanksTitle:
      config?.thanksTitle?.trim() || DEFAULT_REVIEW_FORM_CONFIG.thanksTitle,
    thanksMessage:
      config?.thanksMessage?.trim() || DEFAULT_REVIEW_FORM_CONFIG.thanksMessage,
  };
}

/** Le formulaire contient-il exactement une question de note ? */
export function hasSingleRatingQuestion(
  questions: readonly ReviewFormQuestion[],
): boolean {
  return questions.filter((question) => question.type === "rating").length === 1;
}
