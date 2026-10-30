import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Isolation des espaces : un compte administrateur (ou dirigeant) ne doit
 * jamais atteindre `/dashboard`. La garde `requireCompany` est l'autorité
 * finale : elle résout l'état du compte et renvoie vers `/admin`.
 */

type FakeState =
  | { kind: "anonymous" }
  | { kind: "onboarding" }
  | { kind: "admin"; admin: Record<string, unknown> }
  | { kind: "company"; company: Record<string, unknown> };

const state = vi.hoisted(() => ({ value: { kind: "anonymous" } as FakeState }));
const onboarding = vi.hoisted(() => ({ required: false }));
const blocked = vi.hoisted(() => ({ value: false }));

vi.mock("@/server/auth/account-state", () => ({
  getAccountState: async () => state.value,
}));

vi.mock("@/server/services/company-onboarding", () => ({
  needsCompanyOnboarding: async () => onboarding.required,
}));

vi.mock("@/server/services/company-access", () => ({
  isCompanyAccessBlocked: async () => blocked.value,
  getCompanySubscriptionView: async () => ({
    subscription: null,
    view: { isExpired: blocked.value, status: "ACTIVE", modeLabel: "Essai" },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const { requireCompany, ADMIN_HOME_PATH, ONBOARDING_PATH } = await import(
  "@/server/auth/guards"
);

const COMPANY = {
  id: "11111111-1111-4111-8111-111111111111",
  publicId: "V1StGXR8_Z5jdHi6B-myT",
  name: "Pharmacie Camp Guézo",
  email: "pharmacie@example.com",
  phone: "+22901970000",
  logoUrl: null,
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  state.value = { kind: "anonymous" };
  onboarding.required = false;
  blocked.value = false;
});

describe("requireCompany", () => {
  it("renvoie un administrateur vers /admin, jamais vers /dashboard", async () => {
    state.value = {
      kind: "admin",
      admin: { id: "admin-1", email: "admin@avistrack.com", role: "admin" },
    };

    await expect(requireCompany()).rejects.toThrow(
      `NEXT_REDIRECT:${ADMIN_HOME_PATH}`,
    );
    expect(ADMIN_HOME_PATH).toBe("/admin");
  });

  it("renvoie un dirigeant vers /admin", async () => {
    state.value = {
      kind: "admin",
      admin: {
        id: "admin-2",
        email: "dirigeant@avistrack.com",
        role: "dirigeant",
      },
    };

    await expect(requireCompany()).rejects.toThrow(
      `NEXT_REDIRECT:${ADMIN_HOME_PATH}`,
    );
  });

  it("renvoie un compte sans fiche vers l'onboarding", async () => {
    state.value = { kind: "onboarding" };
    await expect(requireCompany()).rejects.toThrow(
      `NEXT_REDIRECT:${ONBOARDING_PATH}`,
    );
  });

  it("renvoie une entreprise incomplète vers l'onboarding", async () => {
    state.value = { kind: "company", company: COMPANY };
    onboarding.required = true;
    await expect(requireCompany()).rejects.toThrow(
      `NEXT_REDIRECT:${ONBOARDING_PATH}`,
    );
  });

  it("renvoie une entreprise expirée vers l'abonnement", async () => {
    state.value = { kind: "company", company: COMPANY };
    blocked.value = true;
    await expect(requireCompany()).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard/abonnement?expired=1",
    );
  });

  it("laisse passer une entreprise à jour et autorise les pages de secours", async () => {
    state.value = { kind: "company", company: COMPANY };
    await expect(requireCompany()).resolves.toMatchObject({ id: COMPANY.id });

    blocked.value = true;
    await expect(
      requireCompany({ allowExpired: true }),
    ).resolves.toMatchObject({ id: COMPANY.id });
  });
});
