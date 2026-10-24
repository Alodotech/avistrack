import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClient, createFakeTable } from "../stubs/supabase";

/**
 * Suite d'isolation A contre B (§12, couche 4 ; CA-06). Bloquante.
 *
 * Les repositories ne dépendent plus d'un store en mémoire : le client
 * Supabase est simulé (T05). On vérifie deux choses : que la requête porte bien
 * le filtre `company_id` du compte appelant, et que les politiques RLS restent
 * la garantie ultime côté base (documentées dans 002_rls_policies.sql).
 */

const ids = {
  companyA: "11111111-1111-4111-8111-111111111111",
  companyB: "22222222-2222-4222-8222-222222222222",
} as const;

const tables = {
  companies: createFakeTable(),
  reviews: createFakeTable(),
  review_form_configs: createFakeTable(),
};

vi.mock("@/utils/supabase/server", () => ({
  createClient: async () => createFakeClient(tables),
}));

const { listReviewsForCompany, getRatingDistributionForCompany } = await import(
  "@/server/repositories/review-repository"
);

const everything = { page: 1, pageSize: 1000 };

beforeEach(() => {
  for (const table of Object.values(tables)) {
    for (const value of Object.values(table)) {
      if (typeof value === "function" && "mockClear" in value) value.mockClear();
    }
  }
});

describe("isolation des avis entre entreprises", () => {
  it("filtre toujours la requête sur le company_id appelant", async () => {
    await listReviewsForCompany(ids.companyA, everything);
    expect(tables.reviews.eq).toHaveBeenCalledWith("company_id", ids.companyA);

    tables.reviews.eq.mockClear();
    await listReviewsForCompany(ids.companyB, everything);
    expect(tables.reviews.eq).toHaveBeenCalledWith("company_id", ids.companyB);
  });

  it("conserve le filtre d'entreprise quand une note est passée", async () => {
    await listReviewsForCompany(ids.companyA, { ...everything, rating: 2 });
    expect(tables.reviews.eq).toHaveBeenCalledWith("company_id", ids.companyA);
    expect(tables.reviews.eq).toHaveBeenCalledWith("rating", 2);
  });
  it("interroge la distribution sur le seul compte appelant", async () => {
    await getRatingDistributionForCompany(ids.companyB);
    expect(tables.reviews.eq).toHaveBeenCalledWith("company_id", ids.companyB);
  });

  it("refuse toute lecture sans companyId", async () => {
    await expect(listReviewsForCompany("", everything)).rejects.toThrow();
    await expect(getRatingDistributionForCompany("")).rejects.toThrow();
    await expect(
      listReviewsForCompany(undefined as unknown as string, everything),
    ).rejects.toThrow();
  });
});
