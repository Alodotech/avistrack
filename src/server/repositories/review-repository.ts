import "server-only";
import {
  emptyDistribution,
  type RatingDistribution,
} from "@/lib/review-stats";
import type { Page, Rating, Review } from "@/server/domain";
import type { Json, ReviewRow } from "@/types/supabase";
import { createClient } from "@/utils/supabase/server";

/**
 * Seul point d'accès aux avis (cahier des charges §10.2 et §12, couche 2).
 *
 * RÈGLE D'OR : chaque fonction exige un `companyId`, et l'appelant doit le
 * tenir de la session serveur — jamais d'un paramètre, d'un corps ou d'un
 * en-tête de requête. Il n'existe volontairement aucune fonction « tous les
 * avis » ni « avis par identifiant ». Les politiques RLS garantissent en plus
 * qu'une entreprise ne peut pas lire les avis d'une autre.
 */

export type ReviewFilters = {
  rating?: Rating;
  /** Ne garde que les avis déposés à partir de cette date. */
  since?: Date;
};

function assertCompanyId(companyId: string): void {
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("companyId est obligatoire pour toute lecture d'avis.");
  }
}

function toAnswers(value: Json): Record<string, string> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    companyId: row.company_id,
    rating: row.rating as Rating,
    comment: row.comment,
    customerFirstName: row.customer_first_name,
    customerLastName: row.customer_name,
    customerPhone: row.customer_phone,
    reviewerType: row.reviewer_type,
    visitDate: row.visit_date ?? row.created_at.slice(0, 10),
    createdAt: new Date(row.created_at),
    answers: toAnswers(row.answers),
  };
}

export async function listReviewsForCompany(
  companyId: string,
  options: ReviewFilters & { page: number; pageSize: number },
): Promise<Page<Review>> {
  assertCompanyId(companyId);
  const { rating, since, page, pageSize } = options;
  const supabase = await createClient();

  let query = supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (rating !== undefined) query = query.eq("rating", rating);
  if (since !== undefined) query = query.gte("created_at", since.toISOString());

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;

  return {
    items: (data ?? []).map(toReview),
    total: count ?? (data?.length ?? 0),
  };
}

export async function getRatingDistributionForCompany(
  companyId: string,
): Promise<RatingDistribution> {
  assertCompanyId(companyId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("company_id", companyId);
  if (error) throw error;

  const distribution = emptyDistribution();
  for (const review of data ?? []) {
    distribution[review.rating as Rating] += 1;
  }
  return distribution;
}

/**
 * Chronologie des avis d'une entreprise, bornée aux `days` derniers jours.
 *
 * Le tableau de bord n'a besoin que de la note et de la date de chaque avis
 * (courbe de tendance et comparaison de périodes) : la requête ne charge donc
 * ni le commentaire, ni les réponses, et ne remonte pas l'historique complet.
 */
export async function getReviewTimelineForCompany(
  companyId: string,
  days: number,
  now = new Date(),
): Promise<{ rating: Rating; createdAt: Date }[]> {
  assertCompanyId(companyId);
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, created_at")
    .eq("company_id", companyId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    rating: row.rating as Rating,
    createdAt: new Date(row.created_at),
  }));
}

/** Crée un avis pour une entreprise (formulaire public, insertion anonyme). */
export async function createReview(review: Review): Promise<void> {
  assertCompanyId(review.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    id: review.id,
    company_id: review.companyId,
    rating: review.rating,
    comment: review.comment,
    customer_first_name: review.customerFirstName,
    customer_name: review.customerLastName,
    customer_phone: review.customerPhone,
    reviewer_type: review.reviewerType ?? "anonymous",
    visit_date: review.visitDate,
    answers: review.answers ?? {},
  });
  if (error) throw error;
}

export async function createRemark(input: {
  companyId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  message: string;
}): Promise<void> {
  assertCompanyId(input.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("company_remarks").insert({
    company_id: input.companyId,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    message: input.message,
  });
  if (error) throw error;
}

/**
 * Supprime une remarque de l'entreprise connectée.
 *
 * Le filtre porte explicitement sur `company_id` **et** sur l'identifiant de
 * la remarque : un identifiant appartenant à une autre entreprise ne trouve
 * aucune ligne, même si les politiques RLS étaient contournées.
 */
export async function deleteRemark(
  companyId: string,
  remarkId: string,
): Promise<boolean> {
  assertCompanyId(companyId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_remarks")
    .delete()
    .eq("id", remarkId)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function listRemarksForCompany(
  companyId: string,
  options: { page: number; pageSize: number },
): Promise<Page<import("@/server/domain").Remark>> {
  assertCompanyId(companyId);
  const supabase = await createClient();
  const from = (options.page - 1) * options.pageSize;
  const { data, error, count } = await supabase
    .from("company_remarks")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);
  if (error) throw error;
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      companyId: row.company_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      message: row.message,
      createdAt: new Date(row.created_at),
    })),
    total: count ?? 0,
  };
}
