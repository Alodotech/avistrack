import "server-only";
import { withFormDefaults } from "@/lib/review-form";
import type { ReviewFormConfig, ReviewFormQuestion } from "@/server/domain";
import { createClient } from "@/utils/supabase/server";

/**
 * Accès à la personnalisation du formulaire d'avis (Studio du formulaire).
 *
 * Comme les avis, la configuration est strictement cloisonnée par entreprise :
 * `companyId` doit venir de la session serveur, jamais de la requête. En
 * lecture, la politique RLS autorise en plus le visiteur anonyme du formulaire.
 */

const DEFAULT_ACCENT_COLOR = "#d71920";

function assertCompanyId(companyId: string): void {
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("companyId est obligatoire pour lire ou écrire le formulaire.");
  }
}

function toQuestions(value: unknown): ReviewFormQuestion[] | null {
  return Array.isArray(value) ? (value as ReviewFormQuestion[]) : null;
}

export async function getReviewFormConfig(
  companyId: string,
): Promise<ReviewFormConfig> {
  assertCompanyId(companyId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("review_form_configs")
    .select("questions, thanks_title, thanks_message")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return withFormDefaults(null);

  return withFormDefaults({
    questions: toQuestions(data.questions) ?? undefined,
    thanksTitle: data.thanks_title,
    thanksMessage: data.thanks_message,
  });
}

/**
 * Formulaire public d'une entreprise, lu par identifiant public.
 *
 * Le visiteur n'a plus de lecture directe sur `review_form_configs` : la
 * fonction `public_form_config` ne renvoie que la configuration d'une
 * entreprise active, et jamais celle d'une autre.
 */
export async function getPublicReviewFormConfig(
  publicId: string,
): Promise<ReviewFormConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_form_config", {
    p_public_id: publicId,
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) return withFormDefaults(null);

  return withFormDefaults({
    questions: toQuestions(row.questions) ?? undefined,
    thanksTitle: row.thanks_title,
    thanksMessage: row.thanks_message,
  });
}

export async function updateReviewFormConfig(
  companyId: string,
  config: ReviewFormConfig,
): Promise<ReviewFormConfig> {
  assertCompanyId(companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("review_form_configs").upsert(
    {
      company_id: companyId,
      questions: config.questions,
      thanks_title: config.thanksTitle,
      thanks_message: config.thanksMessage,
      allow_comment: config.questions.some((question) => question.type === "text"),
      accent_color: DEFAULT_ACCENT_COLOR,
    },
    { onConflict: "company_id" },
  );
  if (error) throw error;
  return config;
}
