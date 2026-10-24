import "server-only";
import { nextStatus, type StatusChange } from "@/lib/company-status";
import {
  emptyDistribution,
  statsFromDistribution,
} from "@/lib/review-stats";
import { countByMonth, type TrendChartPoint } from "@/lib/review-trend";
import { consecutiveWindows, countWithin } from "@/lib/kpi-delta";
import type { CompanyStatusFilter } from "@/lib/company-filters";
import { escapeSearchPattern } from "@/lib/company-filters";
import type { Company, CompanyStatus, Page } from "@/server/domain";
import type { CompanyRow, CompanyStatusRow } from "@/types/supabase";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/** Statut métier (majuscules) ↔ énumération PostgreSQL (minuscules). */
export function statusFromRow(status: CompanyStatusRow): CompanyStatus {
  return status.toUpperCase() as CompanyStatus;
}

export function statusToRow(status: CompanyStatus): CompanyStatusRow {
  return status.toLowerCase() as CompanyStatusRow;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    status: statusFromRow(row.status),
    createdAt: new Date(row.created_at),
  };
}

/** Vue publique d'une entreprise (formulaire d'avis) : champs strictement nécessaires. */
export type PublicCompany = {
  id: string;
  publicId: string;
  name: string;
  status: CompanyStatus;
};

/** Entreprise de la session courante (isolation garantie par les politiques RLS). */
export async function findCompanyById(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toCompany(data) : null;
}

/**
 * Entreprise lue à privilèges administrateur.
 *
 * Les politiques RLS réservent `companies` à son propriétaire : l'espace Admin
 * passe donc par la clé `service_role` pour lire une fiche qui ne lui
 * appartient pas. Réservé aux repositories d'administration.
 */
export async function findCompanyByIdAsAdmin(id: string): Promise<Company | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toCompany(data) : null;
}

/** Entreprise rattachée à un compte utilisateur (résolution de session). */
export async function findCompanyByUserId(
  userId: string,
): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toCompany(data) : null;
}

/**
 * Entreprise rattachée à un compte utilisateur, y compris supprimée.
 *
 * Une entreprise supprimée reste en base pour l'audit : la page de connexion
 * doit pouvoir distinguer « pas encore de fiche » de « fiche supprimée ».
 */
export async function findCompanyByUserIdIncludingDeleted(
  userId: string,
): Promise<{ company: Company; deleted: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { company: toCompany(data), deleted: data.deleted_at !== null };
}

/**
 * Recherche par identifiant public (lien QR code), accessible aux visiteurs.
 *
 * Le visiteur anonyme n'a plus de lecture directe sur `companies` : la
 * fonction `public_company_by_public_id` est le seul passage autorisé, et elle
 * ne renvoie qu'une entreprise non supprimée.
 */
export async function findPublicCompanyByPublicId(
  publicId: string,
): Promise<PublicCompany | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_company_by_public_id", {
    p_public_id: publicId,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    status: statusFromRow(row.status),
  };
}

/** Recherche par adresse e-mail (contrôle d'unicité côté serveur). */
export async function findCompanyByEmail(email: string): Promise<Company | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toCompany(data) : null;
}

/** Identifiant public d'une nouvelle entreprise : URL-safe et non devinable. */
function randomPublicId(): string {
  const crypto = globalThis.crypto;
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto
    .randomUUID()
    .slice(0, 4)}`;
}

/** Identifiant lisible dérivé du nom, garanti unique par suffixe aléatoire. */
function buildSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const suffix = globalThis.crypto.randomUUID().slice(0, 6);
  return base.length > 0 ? `${base}-${suffix}` : `entreprise-${suffix}`;
}

export type CreateCompanyInput = {
  /** Compte Supabase Auth propriétaire de la fiche. */
  userId: string;
  name: string;
  email: string;
  phone: string;
};

export type CreateCompanyResult =
  | { ok: true; company: Company }
  | { ok: false; reason: "EMAIL_TAKEN" };

/**
 * Création de la fiche entreprise lors de l'onboarding. Le compte est actif
 * d'emblée ; l'unicité de l'e-mail est garantie par un index partiel.
 */
export async function createCompany(
  input: CreateCompanyInput,
): Promise<CreateCompanyResult> {
  const existing = await findCompanyByEmail(input.email);
  if (existing) return { ok: false, reason: "EMAIL_TAKEN" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      user_id: input.userId,
      public_id: randomPublicId(),
      slug: buildSlug(input.name),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
    })
    .select("*")
    .single();
  if (error) {
    // Violation d'unicité (course entre deux inscriptions simultanées).
    if (error.code === "23505") return { ok: false, reason: "EMAIL_TAKEN" };
    throw error;
  }
  return { ok: true, company: toCompany(data) };
}

export async function updateCompanyProfile(
  companyId: string,
  profile: { name: string; phone: string },
): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .update({ name: profile.name, phone: profile.phone })
    .eq("id", companyId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toCompany(data) : null;
}

/* -------------------------------------------------------------------------- */
/* Vue Administrateur                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ligne de la liste Admin. AD-05 : uniquement des agrégats, jamais le contenu
 * d'un avis — ce type ne doit pas recevoir de champ `comment`.
 */
export type AdminCompanyRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CompanyStatus;
  createdAt: Date;
  reviewCount: number;
  averageRating: number | null;
};

/**
 * Liste administrative des entreprises (T31, T32).
 *
 * Le filtrage est appliqué en base (statut, période d'adhésion, recherche
 * textuelle) : la pagination porte sur le jeu filtré, pas sur la liste
 * entière.
 */
export async function listCompaniesForAdmin(options: {
  search?: string;
  status?: CompanyStatusFilter;
  /** Bornes d'adhésion ; `from` et `to` sont inclusifs. */
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}): Promise<Page<AdminCompanyRow>> {
  const supabase = createAdminClient();
  const needle = options.search?.trim();

  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.from) {
    query = query.gte("created_at", options.from.toISOString());
  }
  if (options.to) {
    query = query.lte("created_at", options.to.toISOString());
  }
  if (needle) {
    // Les métacaractères de `or` (PostgREST) et de `ilike` (PostgreSQL) sont
    // neutralisés : une recherche contenant `%` ou `_` reste une recherche
    // littérale, jamais un motif.
    const escaped = escapeSearchPattern(needle);
    if (escaped.length > 0) {
      query = query.or(
        `name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
      );
    }
  }

  query = query.order("created_at", { ascending: false });

  const from = (options.page - 1) * options.pageSize;
  const { data, error, count } = await query.range(from, from + options.pageSize - 1);
  if (error) throw error;

  const companies = data ?? [];
  const rows = await withReviewAggregates(supabase, companies);
  return { items: rows, total: count ?? rows.length };
}

/** Agrège note moyenne et volume d'avis pour une liste d'entreprises. */
async function withReviewAggregates(
  supabase: ReturnType<typeof createAdminClient>,
  companies: CompanyRow[],
): Promise<AdminCompanyRow[]> {
  if (companies.length === 0) return [];

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("company_id, rating")
    .in(
      "company_id",
      companies.map((company) => company.id),
    );
  if (error) throw error;

  const distributions = new Map<string, ReturnType<typeof emptyDistribution>>();
  for (const review of reviews ?? []) {
    const distribution =
      distributions.get(review.company_id) ?? emptyDistribution();
    distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
    distributions.set(review.company_id, distribution);
  }

  return companies.map((company) => {
    const stats = statsFromDistribution(
      distributions.get(company.id) ?? emptyDistribution(),
    );
    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone ?? "",
      status: statusFromRow(company.status),
      createdAt: new Date(company.created_at),
      reviewCount: stats.total,
      averageRating: stats.average,
    };
  });
}

/** Dernières entreprises inscrites, pour le tableau de bord Admin. */
export type RecentCompany = {
  id: string;
  name: string;
  email: string;
  status: CompanyStatus;
  createdAt: Date;
};

/**
 * Vérifie que la base répond et que le schéma est en place.
 *
 * Requête `head` : aucune ligne n'est téléchargée. Utilisée par la sonde
 * `/api/health`.
 */
export async function pingDatabase(): Promise<{ ok: boolean; detail: string }> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: `${count ?? 0} entreprise(s)` };
}

export async function listRecentCompanies(limit = 5): Promise<RecentCompany[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, email, status, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: statusFromRow(row.status),
    createdAt: new Date(row.created_at),
  }));
}


export type PlatformStats = {
  companyCount: number;
  suspendedCompanyCount: number;
  reviewCount: number;
  averageRating: number | null;
  newCompaniesLast7Days: number;
  newCompaniesLast30Days: number;
  /** Même durée que `newCompaniesLast30Days`, décalée d'un mois en arrière. */
  newCompaniesPrevious30Days: number;
  reviewsLast30Days: number;
  reviewsPrevious30Days: number;
  companiesLast12Months: TrendChartPoint[];
  reviewsLast12Months: TrendChartPoint[];
};

/**
 * Métriques globales de la plateforme, avec la comparaison à la période
 * précédente qui alimente les variations des indicateurs.
 *
 * Le regroupement est fait en base par `platform_stats()` : le tableau de bord
 * ne charge plus l'intégralité des entreprises et des avis en mémoire. Si la
 * migration 003 n'est pas encore appliquée sur l'instance, le calcul est
 * refait en JavaScript — les chiffres restent corrects, seuls le volume de
 * données lu diffère.
 */
export async function getPlatformStats(now = new Date()): Promise<PlatformStats> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("platform_stats");
  if (!error && data) {
    return {
      companyCount: data.company_count,
      suspendedCompanyCount: data.suspended_company_count,
      reviewCount: data.review_count,
      averageRating:
        data.average_rating === null ? null : Number(data.average_rating),
      newCompaniesLast7Days: data.new_companies_last_7_days,
      newCompaniesLast30Days: data.new_companies_last_30_days,
      newCompaniesPrevious30Days: data.new_companies_previous_30_days,
      reviewsLast30Days: data.reviews_last_30_days,
      reviewsPrevious30Days: data.reviews_previous_30_days,
      companiesLast12Months: data.companies_last_12_months.map(toTrendPoint),
      reviewsLast12Months: data.reviews_last_12_months.map(toTrendPoint),
    };
  }

  return getPlatformStatsInMemory(supabase, now);
}

function toTrendPoint(row: { month: string; count: number }): TrendChartPoint {
  return { month: row.month, count: row.count };
}

/** Repli utilisé tant que la fonction `platform_stats()` n'est pas disponible. */
async function getPlatformStatsInMemory(
  supabase: ReturnType<typeof createAdminClient>,
  now: Date,
): Promise<PlatformStats> {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, status, created_at")
    .is("deleted_at", null);
  if (error) throw error;

  const live = companies ?? [];
  const companyDates = live.map((company) => new Date(company.created_at));
  const liveIds = live.map((company) => company.id);

  let reviewCount = 0;
  let averageRating: number | null = null;
  let reviewDates: Date[] = [];

  if (liveIds.length > 0) {
    const { data: reviews, error: reviewError } = await supabase
      .from("reviews")
      .select("rating, created_at")
      .in(
        "company_id",
        liveIds,
      );
    if (reviewError) throw reviewError;

    const rows = reviews ?? [];
    reviewCount = rows.length;
    const distribution = emptyDistribution();
    for (const row of rows) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
    averageRating = statsFromDistribution(distribution).average;
    reviewDates = rows.map((row) => new Date(row.created_at));
  }

  const windows = consecutiveWindows(now, 30);
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  return {
    companyCount: live.length,
    suspendedCompanyCount: live.filter((company) => company.status === "suspended").length,
    reviewCount,
    averageRating,
    newCompaniesLast7Days: companyDates.filter(
      (date) => date.getTime() >= sevenDaysAgo,
    ).length,
    newCompaniesLast30Days: countWithin(companyDates, windows.current),
    newCompaniesPrevious30Days: countWithin(companyDates, windows.previous),
    reviewsLast30Days: countWithin(reviewDates, windows.current),
    reviewsPrevious30Days: countWithin(reviewDates, windows.previous),
    companiesLast12Months: countByMonth(companyDates, now),
    reviewsLast12Months: countByMonth(reviewDates, now),
  };
}

export type CompanyMutationResult =
  | { ok: true; company: Company }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

/** AD-03 : bascule active ⇄ suspendue. */
export async function changeCompanyStatus(
  id: string,
  change: StatusChange,
): Promise<CompanyMutationResult> {
  const supabase = createAdminClient();
  const { data: current, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!current) return { ok: false, reason: "NOT_FOUND" };

  const status = nextStatus(statusFromRow(current.status), change);
  if (!status) return { ok: false, reason: "INVALID_TRANSITION" };

  const { data, error: updateError } = await supabase
    .from("companies")
    .update({ status: statusToRow(status) })
    .eq("id", id)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return { ok: true, company: toCompany(data) };
}

/**
 * Suppression logique immédiate (AD-04). La purge définitive après 30 jours
 * relève d'une tâche planifiée côté backend, hors périmètre des dashboards.
 */
export async function softDeleteCompany(
  id: string,
): Promise<CompanyMutationResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "NOT_FOUND" };
  return { ok: true, company: toCompany(data) };
}
