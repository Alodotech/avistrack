import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_IDS, resetStore } from "@/server/dev/memory-store";

/**
 * Isolation au niveau HTTP (CA-06) : l'entreprise B, authentifiée, tente
 * d'obtenir les données de A en modifiant les identifiants de la requête.
 */

const session = vi.hoisted(() => ({ companyId: null as string | null }));

vi.mock("@/server/auth/session", () => ({
  getCompanySession: async () =>
    session.companyId ? { companyId: session.companyId } : null,
  getAdminSession: async () => null,
}));

// `cache` de React ne mémoïse que dans un rendu serveur ; ici on veut la fonction nue.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const { GET: getReviews } = await import("@/app/api/company/reviews/route");
const { GET: getQr } = await import("@/app/api/company/qr/route");

function request(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  resetStore();
  session.companyId = null;
});

describe("GET /api/company/reviews", () => {
  it("répond 401 sans session", async () => {
    const response = await getReviews(request("/api/company/reviews"));
    expect(response.status).toBe(401);
  });

  it("ignore tout identifiant d'entreprise fourni par le client", async () => {
    session.companyId = DEV_IDS.companyB;
    const own = await (await getReviews(request("/api/company/reviews"))).json();

    const spoofed = [
      `/api/company/reviews?company_id=${DEV_IDS.companyA}`,
      `/api/company/reviews?companyId=${DEV_IDS.companyA}`,
      `/api/company/reviews?publicId=V1StGXR8_Z5jdHi6B-myT`,
    ];
    for (const path of spoofed) {
      const response = await getReviews(
        request(path, { "x-company-id": DEV_IDS.companyA }),
      );
      expect(await response.json()).toEqual(own);
    }
    expect(own.total).toBe(12);
  });

  it("n'expose pas le company_id dans la réponse", async () => {
    session.companyId = DEV_IDS.companyA;
    const body = await (await getReviews(request("/api/company/reviews"))).json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(DEV_IDS.companyA);
  });

  it("répond 403 pour une entreprise suspendue ou en attente (DE-05)", async () => {
    for (const id of [DEV_IDS.companySuspended, DEV_IDS.companyPending]) {
      session.companyId = id;
      const response = await getReviews(request("/api/company/reviews"));
      expect(response.status).toBe(403);
      expect(await response.json()).not.toHaveProperty("items");
    }
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
    session.companyId = DEV_IDS.companySuspended;
    expect((await getQr(request("/api/company/qr"))).status).toBe(403);
  });

  it("encode le lien public de l'entreprise de la session, en PNG et en SVG", async () => {
    session.companyId = DEV_IDS.companyB;

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
