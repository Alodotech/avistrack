import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Isolation au niveau HTTP (CA-06) : l'entreprise B, authentifiée, tente
 * d'obtenir les données de A en modifiant les identifiants de la requête.
 * La session est simulée (T05) ; le repository renvoie les avis du compte.
 */

const session = vi.hoisted(() => ({ companyId: null as string | null }));

vi.mock("@/server/auth/guards", async () => {
  const companyRepository =
    await import("@/server/repositories/company-repository");
  return {
    getCurrentCompany: async () =>
      session.companyId
        ? companyRepository.findCompanyById(session.companyId)
        : null,
  };
});

const THIRTEEN = Array.from({ length: 12 }, (_, index) => ({
  id: `review-${index}`,
  companyId: "22222222-2222-4222-8222-222222222222",
  rating: 5,
  comment: null,
  visitDate: "2026-01-01",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
}));

vi.mock("@/server/repositories/company-repository", () => ({
  findCompanyById: async (id: string) => {
    if (id === "11111111-1111-4111-8111-111111111111") {
      return {
        id,
        publicId: "V1StGXR8_Z5jdHi6B-myT",
        name: "Pharmacie Camp Guézo",
        email: "a@example.com",
        phone: "",
        status: "ACTIVE",
        createdAt: new Date(),
      };
    }
    if (id === "22222222-2222-4222-8222-222222222222") {
      return {
        id,
        publicId: "k9Qm2xLr7WpTz4HbN_e1c",
        name: "Boutique Élégance",
        email: "b@example.com",
        phone: "",
        status: "ACTIVE",
        createdAt: new Date(),
      };
    }
    if (id === "33333333-3333-4333-8333-333333333333") {
      return {
        id,
        publicId: "Zt3vY8uA1sDf6GhJ0kLpQ",
        name: "Magasin Central",
        email: "c@example.com",
        phone: "",
        status: "SUSPENDED",
        createdAt: new Date(),
      };
    }
    if (id === "44444444-4444-4444-8444-444444444444") {
      return {
        id,
        publicId: "b7NcX2mVq9WeRt5Yu1IoP",
        name: "Hôtel du Lac",
        email: "d@example.com",
        phone: "",
        status: "PENDING",
        createdAt: new Date(),
      };
    }
    return null;
  },
}));

/** L'abonnement est simulé : seul le verrou de statut est testé ici. */
const access = vi.hoisted(() => ({ blocked: false }));

vi.mock("@/server/services/company-access", () => ({
  isCompanyAccessBlocked: async () => access.blocked,
  getCompanySubscriptionView: async () => ({
    subscription: null,
    view: { isExpired: false, status: "ACTIVE", modeLabel: "Essai", statusLabel: "Actif" },
  }),
}));

vi.mock("@/server/repositories/review-repository", () => ({
  listReviewsForCompany: async (companyId: string) => ({
    items: THIRTEEN.map((review) => ({ ...review, companyId })),
    total: 12,
  }),
  getAllReviewsForCompany: async (companyId: string) =>
    THIRTEEN.map((review) => ({ ...review, companyId })),
  getRatingDistributionForCompany: async () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 12 }),
}));

const { GET: getReviews } = await import("@/app/api/company/reviews/route");
const { GET: getQr } = await import("@/app/api/company/qr/route");

const IDS = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  suspended: "33333333-3333-4333-8333-333333333333",
  pending: "44444444-4444-4444-8444-444444444444",
} as const;

function request(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  session.companyId = null;
  access.blocked = false;
});

describe("GET /api/company/reviews", () => {
  it("répond 401 sans session", async () => {
    const response = await getReviews(request("/api/company/reviews"));
    expect(response.status).toBe(401);
  });

  it("ignore tout identifiant d'entreprise fourni par le client", async () => {
    session.companyId = IDS.b;
    const own = await (await getReviews(request("/api/company/reviews"))).json();

    const spoofed = [
      `/api/company/reviews?company_id=${IDS.a}`,
      `/api/company/reviews?companyId=${IDS.a}`,
      `/api/company/reviews?publicId=V1StGXR8_Z5jdHi6B-myT`,
    ];
    for (const path of spoofed) {
      const response = await getReviews(request(path, { "x-company-id": IDS.a }));
      expect(await response.json()).toEqual(own);
    }
    expect(own.total).toBe(12);
  });

  it("n'expose pas le company_id dans la réponse", async () => {
    session.companyId = IDS.a;
    const body = await (await getReviews(request("/api/company/reviews"))).json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(IDS.a);
  });

  it("répond 403 pour une entreprise suspendue ou en attente (DE-05)", async () => {
    for (const id of [IDS.suspended, IDS.pending]) {
      session.companyId = id;
      const response = await getReviews(request("/api/company/reviews"));
      expect(response.status).toBe(403);
      expect(await response.json()).not.toHaveProperty("items");
    }
  });

  it("répond 403 quand l'abonnement a expiré", async () => {
    session.companyId = IDS.a;
    access.blocked = true;
    const response = await getReviews(request("/api/company/reviews"));
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("items");

    expect((await getQr(request("/api/company/qr"))).status).toBe(403);
  });

  it("répond 401 quand la session désigne une entreprise inexistante", async () => {
    session.companyId = "99999999-9999-4999-8999-999999999999";
    const response = await getReviews(request("/api/company/reviews"));
    expect(response.status).toBe(401);
  });
});

describe("GET /api/company/qr", () => {
  it("répond 401 sans session et 403 pour un compte suspendu", async () => {
    expect((await getQr(request("/api/company/qr"))).status).toBe(401);
    session.companyId = IDS.suspended;
    expect((await getQr(request("/api/company/qr"))).status).toBe(403);
  });

  it("encode le lien public de l'entreprise de la session, en PNG et en SVG", async () => {
    session.companyId = IDS.b;

    const svg = await getQr(request("/api/company/qr?format=svg&download"));
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    expect(svg.headers.get("content-disposition")).toContain("attachment");
    expect(await svg.text()).toContain("<svg");

    const png = await getQr(request("/api/company/qr?format=png"));
    expect(png.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await png.arrayBuffer());
    expect([...bytes.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  });
});
