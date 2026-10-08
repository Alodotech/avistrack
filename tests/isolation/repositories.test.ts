import { beforeEach, describe, expect, it } from "vitest";
import { DEV_IDS, resetStore } from "@/server/dev/memory-store";
import {
  changeCompanyStatus,
  findCompanyById,
  listCompaniesForAdmin,
  softDeleteCompany,
} from "@/server/repositories/company-repository";
import {
  getRatingDistributionForCompany,
  listReviewsForCompany,
} from "@/server/repositories/review-repository";

/**
 * Suite d'isolation A contre B (§12, couche 4 ; CA-06). Bloquante : un échec
 * ici signifie qu'une entreprise peut voir les données d'une autre.
 */

const everything = { page: 1, pageSize: 1000 };

beforeEach(() => resetStore());

describe("isolation des avis entre entreprises", () => {
  it("ne retourne à A que les avis de A", async () => {
    const a = await listReviewsForCompany(DEV_IDS.companyA, everything);
    const b = await listReviewsForCompany(DEV_IDS.companyB, everything);

    expect(a.total).toBe(47);
    expect(b.total).toBe(12);
    expect(a.items.every((r) => r.companyId === DEV_IDS.companyA)).toBe(true);
    expect(b.items.every((r) => r.companyId === DEV_IDS.companyB)).toBe(true);

    const idsOfA = new Set(a.items.map((r) => r.id));
    expect(b.items.some((r) => idsOfA.has(r.id))).toBe(false);
  });

  it("garde l'isolation quand des filtres sont appliqués", async () => {
    for (const rating of [1, 2, 3, 4, 5] as const) {
      const page = await listReviewsForCompany(DEV_IDS.companyA, {
        ...everything,
        rating,
        since: new Date(0),
      });
      expect(page.items.every((r) => r.companyId === DEV_IDS.companyA)).toBe(true);
    }
  });

  it("calcule les statistiques sur les seuls avis de l'entreprise", async () => {
    const distribution = await getRatingDistributionForCompany(DEV_IDS.companyB);
    const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(12);
  });

  it("refuse toute lecture sans companyId", async () => {
    await expect(listReviewsForCompany("", everything)).rejects.toThrow();
    await expect(getRatingDistributionForCompany("")).rejects.toThrow();
    await expect(
      listReviewsForCompany(undefined as unknown as string, everything),
    ).rejects.toThrow();
  });

  it("ne retourne rien pour un companyId inconnu", async () => {
    const page = await listReviewsForCompany("inconnu", everything);
    expect(page).toEqual({ items: [], total: 0 });
  });
});

describe("vue Administrateur", () => {
  it("n'expose que des agrégats, jamais le contenu d'un avis (AD-05)", async () => {
    const { items } = await listCompaniesForAdmin({ page: 1, pageSize: 100 });
    expect(items.length).toBeGreaterThan(0);
    for (const row of items) {
      expect(Object.keys(row).sort()).toEqual([
        "averageRating",
        "createdAt",
        "email",
        "id",
        "name",
        "reviewCount",
        "status",
      ]);
    }
  });

  it("suspendre A n'affecte pas B (CA-09)", async () => {
    const result = await changeCompanyStatus(DEV_IDS.companyA, "SUSPEND");
    expect(result.ok).toBe(true);
    expect((await findCompanyById(DEV_IDS.companyA))?.status).toBe("SUSPENDED");
    expect((await findCompanyById(DEV_IDS.companyB))?.status).toBe("ACTIVE");
  });

  it("rend introuvable une entreprise supprimée", async () => {
    await softDeleteCompany(DEV_IDS.companyA);
    expect(await findCompanyById(DEV_IDS.companyA)).toBeNull();
    const { items } = await listCompaniesForAdmin({ page: 1, pageSize: 100 });
    expect(items.some((row) => row.id === DEV_IDS.companyA)).toBe(false);
    expect(await softDeleteCompany(DEV_IDS.companyA)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });
});
