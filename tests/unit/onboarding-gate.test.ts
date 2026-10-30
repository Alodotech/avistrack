import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Company, CompanySubscription } from "@/server/domain";

/**
 * RG — le choix du forfait ne peut pas être contourné.
 *
 * Un compte dont la fiche est complète (téléphone renseigné) mais qui n'a
 * aucune ligne dans `company_subscriptions` reste en onboarding : il est
 * renvoyé à l'étape forfait, jamais au tableau de bord sur un essai calculé à
 * la volée.
 */

const store = vi.hoisted(() => ({
  subscription: null as CompanySubscription | null,
}));

vi.mock("@/server/repositories/subscription-repository", () => ({
  getCompanySubscription: async () => store.subscription,
  ensureTrialSubscription: async () => store.subscription,
  activatePaidSubscription: async () => store.subscription,
  ensureTrial: async () => store.subscription,
}));

vi.mock("@/server/repositories/company-repository", () => ({
  findCompanyByUserId: async () => null,
  createCompany: async () => ({ ok: false, reason: "EMAIL_TAKEN" }),
}));

const { needsCompanyOnboarding, needsProfileCompletion } = await import(
  "@/server/services/company-onboarding"
);

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    publicId: "V1StGXR8_Z5jdHi6B-myT",
    name: "Pharmacie Camp Guézo",
    email: "pharmacie@example.com",
    phone: "+22901970000",
    logoUrl: null,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function subscription(): CompanySubscription {
  return {
    companyId: "11111111-1111-4111-8111-111111111111",
    plan: "trial",
    period: "trial",
    amount: 0,
    status: "TRIALING",
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-01-15T00:00:00.000Z"),
    trialEndDate: new Date("2026-01-15T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

beforeEach(() => {
  store.subscription = null;
});

describe("needsCompanyOnboarding", () => {
  it("reste vrai pour un compte avec téléphone mais sans abonnement", async () => {
    expect(needsProfileCompletion(company())).toBe(false);
    await expect(needsCompanyOnboarding(company())).resolves.toBe(true);
  });

  it("reste vrai quand le téléphone manque, même avec un abonnement", async () => {
    store.subscription = subscription();
    await expect(needsCompanyOnboarding(company({ phone: "" }))).resolves.toBe(
      true,
    );
  });

  it("devient faux quand la fiche et le forfait sont enregistrés", async () => {
    store.subscription = subscription();
    await expect(needsCompanyOnboarding(company())).resolves.toBe(false);
  });
});
