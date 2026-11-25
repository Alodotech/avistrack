import "server-only";
import type { SubscriptionPeriod } from "@/server/domain";
import type { Json } from "@/types/supabase";
import { createAdminClient } from "@/utils/supabase/admin";

export type PlatformActivityPoint = {
  date: string;
  registrations: number;
  subscriptions: number;
  reviews: number;
};

export type PlatformActivity = {
  days: number;
  from: Date;
  to: Date;
  /** Total d'entreprises utilisatrices, affiché en chiffre clé. */
  totalCompanies: number;
  registrations: number;
  registrationsWithSubscription: number;
  subscribedCompanies: number;
  reviews: number;
  subscriptionEvents: number;
  /** Deux séries seulement : inscrites (vert) et inscrites avec abonnement (orange). */
  points: PlatformActivityPoint[];
};

function readDetail(details: Json, key: string): string | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = details[key];
  return typeof value === "string" ? value : null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Activité de la plateforme sur une fenêtre glissante : inscriptions et
 * inscriptions assorties d'un abonnement payant. Le nombre d'entreprises ayant
 * reçu un avis n'est plus tracé comme une série (elle n'était pas demandée).
 */
export async function getPlatformActivity(
  days: 7 | 30 | 365,
  now = new Date(),
): Promise<PlatformActivity> {
  const supabase = createAdminClient();
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(now.getTime() - (days - 1) * dayMs);
  start.setUTCHours(0, 0, 0, 0);

  const [companiesResult, reviewsResult, subscriptionsResult, plansResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, status, created_at")
        .is("deleted_at", null),
      supabase
        .from("reviews")
        .select("company_id, created_at")
        .gte("created_at", start.toISOString()),
      supabase
        .from("audit_logs")
        .select("target_id, details, created_at")
        .eq("action", "UPDATE_SUBSCRIPTION")
        .eq("target_type", "company")
        .order("created_at", { ascending: false }),
      supabase
        .from("company_subscriptions")
        .select("company_id, plan, period, status"),
    ]);

  if (companiesResult.error) throw companiesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (plansResult.error) throw plansResult.error;

  const companies = companiesResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const subscriptionLogs = subscriptionsResult.data ?? [];
  const paidPlans = new Set(
    (plansResult.data ?? [])
      .filter(
        (row) =>
          row.plan === "pro" &&
          (row.period === "monthly" || row.period === "annual") &&
          row.status !== "expired" &&
          row.status !== "suspended",
      )
      .map((row) => row.company_id),
  );

  const points = new Map<string, PlatformActivityPoint>();
  for (let index = 0; index < days; index += 1) {
    const key = dayKey(new Date(start.getTime() + index * dayMs));
    points.set(key, {
      date: key,
      registrations: 0,
      subscriptions: 0,
      reviews: 0,
    });
  }

  let registrations = 0;
  let registrationsWithSubscription = 0;
  for (const company of companies) {
    const createdAt = new Date(company.created_at);
    if (createdAt < start) continue;
    registrations += 1;
    const key = dayKey(createdAt);
    const point = points.get(key);
    if (point) point.registrations += 1;
    if (paidPlans.has(company.id)) {
      registrationsWithSubscription += 1;
      if (point) point.subscriptions += 1;
    }
  }

  let reviewCount = 0;
  for (const review of reviews) {
    const createdAt = new Date(review.created_at);
    reviewCount += 1;
    const key = dayKey(createdAt);
    const point = points.get(key);
    if (!point) continue;
    point.reviews += 1;
  }

  const latestSubscription = new Map<string, SubscriptionPeriod>();
  let subscriptionEvents = 0;
  for (const entry of subscriptionLogs) {
    const period = readDetail(entry.details, "period");
    if (!period) continue;
    if (!latestSubscription.has(entry.target_id)) {
      latestSubscription.set(entry.target_id, period as SubscriptionPeriod);
    }
    const createdAt = new Date(entry.created_at);
    if (createdAt < start) continue;
    if (period !== "monthly" && period !== "annual") continue;
    subscriptionEvents += 1;
  }

  const subscribedCompanies = [...latestSubscription.values()].filter(
    (period) => period === "monthly" || period === "annual",
  ).length;

  return {
    days,
    from: start,
    to: now,
    totalCompanies: companies.length,
    registrations,
    registrationsWithSubscription,
    subscribedCompanies,
    reviews: reviewCount,
    subscriptionEvents,
    points: [...points.values()],
  };
}
