import "server-only";
import { nextStatus, type StatusChange } from "@/lib/company-status";
import { emptyDistribution, statsFromDistribution } from "@/lib/review-stats";
import { getStore, type CompanyRecord } from "@/server/dev/memory-store";
import type { Company, CompanyStatus, Page } from "@/server/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

function toCompany(record: CompanyRecord): Company {
  return {
    id: record.id,
    publicId: record.publicId,
    name: record.name,
    email: record.email,
    phone: record.phone,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function findRecord(id: string): CompanyRecord | undefined {
  return getStore().companies.find(
    (company) => company.id === id && company.deletedAt === null,
  );
}

/** Une entreprise supprimée (suppression logique) est introuvable. */
export async function findCompanyById(id: string): Promise<Company | null> {
  const record = findRecord(id);
  return record ? toCompany(record) : null;
}

/** Recherche par identifiant public (lien QR code). */
export async function findCompanyByPublicId(
  publicId: string,
): Promise<Company | null> {
  const record = getStore().companies.find(
    (c) => c.publicId === publicId && c.deletedAt === null,
  );
  return record ? toCompany(record) : null;
}

export async function updateCompanyProfile(
  companyId: string,
  profile: { name: string; phone: string },
): Promise<Company | null> {
  const record = findRecord(companyId);
  if (!record) return null;
  record.name = profile.name;
  record.phone = profile.phone;
  return toCompany(record);
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
  status: CompanyStatus;
  createdAt: Date;
  reviewCount: number;
  averageRating: number | null;
};

export async function listCompaniesForAdmin(options: {
  search?: string;
  page: number;
  pageSize: number;
}): Promise<Page<AdminCompanyRow>> {
  const { companies, reviews } = getStore();
  const needle = options.search?.trim().toLowerCase();

  const matching = companies
    .filter(
      (company) =>
        company.deletedAt === null &&
        (!needle ||
          company.name.toLowerCase().includes(needle) ||
          company.email.toLowerCase().includes(needle)),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const start = (options.page - 1) * options.pageSize;
  const items = matching
    .slice(start, start + options.pageSize)
    .map((company): AdminCompanyRow => {
      const distribution = emptyDistribution();
      for (const review of reviews) {
        if (review.companyId === company.id) distribution[review.rating] += 1;
      }
      const stats = statsFromDistribution(distribution);
      return {
        id: company.id,
        name: company.name,
        email: company.email,
        status: company.status,
        createdAt: company.createdAt,
        reviewCount: stats.total,
        averageRating: stats.average,
      };
    });

  return { items, total: matching.length };
}

export type PlatformStats = {
  companyCount: number;
  suspendedCompanyCount: number;
  reviewCount: number;
  newCompaniesLast30Days: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const { companies, reviews } = getStore();
  const live = companies.filter((company) => company.deletedAt === null);
  const liveIds = new Set(live.map((company) => company.id));
  const threshold = Date.now() - 30 * DAY_MS;

  return {
    companyCount: live.length,
    suspendedCompanyCount: live.filter(
      (company) => company.status === "SUSPENDED",
    ).length,
    reviewCount: reviews.filter((review) => liveIds.has(review.companyId))
      .length,
    newCompaniesLast30Days: live.filter(
      (company) => company.createdAt.getTime() >= threshold,
    ).length,
  };
}

export type CompanyMutationResult =
  | { ok: true; company: Company }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

export async function changeCompanyStatus(
  id: string,
  change: StatusChange,
): Promise<CompanyMutationResult> {
  const record = findRecord(id);
  if (!record) return { ok: false, reason: "NOT_FOUND" };

  const status = nextStatus(record.status, change);
  if (!status) return { ok: false, reason: "INVALID_TRANSITION" };

  record.status = status;
  return { ok: true, company: toCompany(record) };
}

/**
 * Suppression logique immédiate (AD-04). La purge définitive après 30 jours
 * relève d'une tâche planifiée côté backend, hors périmètre des dashboards.
 */
export async function softDeleteCompany(
  id: string,
): Promise<CompanyMutationResult> {
  const record = findRecord(id);
  if (!record) return { ok: false, reason: "NOT_FOUND" };
  record.deletedAt = new Date();
  return { ok: true, company: toCompany(record) };
}
