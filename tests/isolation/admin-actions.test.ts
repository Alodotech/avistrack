import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les actions Admin sont joignables par un POST direct : elles doivent refuser
 * tout appelant sans droits d'administration, y compris une entreprise
 * connectée. Les repositories sont simulés (T05) : on vérifie que l'action
 * n'entraîne aucune mutation ni journalisation sans administrateur.
 */

const CHANGED = vi.hoisted(() => ({
  status: 0,
  deleted: 0,
  audited: 0,
  reasons: [] as string[],
}));

vi.mock("@/server/auth/guards", () => ({
  ADMIN_LOGIN_PATH: "/admin/login",
  getCurrentAdmin: async () =>
    session.adminId ? { id: session.adminId, email: "admin@avistrack.example" } : null,
}));

const session = vi.hoisted(() => ({ adminId: null as string | null }));

vi.mock("@/server/repositories/company-repository", () => ({
  findCompanyById: async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Pharmacie Camp Guézo",
  }),
  findCompanyByIdAsAdmin: async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Pharmacie Camp Guézo",
  }),
  changeCompanyStatus: async () => {
    CHANGED.status += 1;
    return {
      ok: true,
      company: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Pharmacie Camp Guézo",
      },
    };
  },
  softDeleteCompany: async () => {
    CHANGED.deleted += 1;
    return {
      ok: true,
      company: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Pharmacie Camp Guézo",
      },
    };
  },
}));

vi.mock("@/server/repositories/audit-log-repository", () => ({
  recordAdminAction: async (entry: { reason: string }) => {
    CHANGED.audited += 1;
    CHANGED.reasons.push(entry.reason);
  },
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { changeCompanyStatusAction, deleteCompanyAction } = await import(
  "@/app/(admin)/admin/entreprises/actions"
);

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const idle = { status: "idle" } as const;
const REASON = "Demande explicite de l'entreprise";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const suspend = (companyId: string) =>
  changeCompanyStatusAction(
    idle,
    form({ companyId, change: "SUSPEND", reason: REASON }),
  );

beforeEach(() => {
  session.adminId = null;
  CHANGED.status = 0;
  CHANGED.deleted = 0;
  CHANGED.audited = 0;
  CHANGED.reasons = [];
});

describe("autorisation des actions Admin", () => {
  it("refuse un appelant sans session administrateur", async () => {
    await expect(suspend(COMPANY_ID)).rejects.toThrow("REDIRECT:/admin/login");
    expect(CHANGED.status).toBe(0);
    expect(CHANGED.audited).toBe(0);
  });

  it("refuse une entreprise connectée (aucun admin en base)", async () => {
    // `getCurrentAdmin` renvoie null tant qu'aucun adminId n'est posé.
    await expect(suspend(COMPANY_ID)).rejects.toThrow("REDIRECT:/admin/login");
    await expect(
      deleteCompanyAction(
        idle,
        form({
          companyId: COMPANY_ID,
          confirmation: "Pharmacie Camp Guézo",
          reason: REASON,
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/login");
    expect(CHANGED.deleted).toBe(0);
    expect(CHANGED.audited).toBe(0);
  });
});

describe("suspension et suppression (AD-03, AD-04)", () => {
  beforeEach(() => {
    session.adminId = ADMIN_ID;
  });

  it("suspend puis journalise l'action (AD-06)", async () => {
    expect(await suspend(COMPANY_ID)).toEqual({ status: "done" });
    expect(CHANGED.status).toBe(1);
    expect(CHANGED.audited).toBe(1);
    expect(CHANGED.reasons).toEqual([REASON]);
  });

  it("supprime logiquement après saisie du nom exact", async () => {
    const result = await deleteCompanyAction(
      idle,
      form({
        companyId: COMPANY_ID,
        confirmation: "Pharmacie Camp Guézo",
        reason: REASON,
      }),
    );
    expect(result).toEqual({ status: "done" });
    expect(CHANGED.deleted).toBe(1);
    expect(CHANGED.audited).toBe(1);
  });

  it("rejette une confirmation inexacte sans rien supprimer", async () => {
    const result = await deleteCompanyAction(
      idle,
      form({ companyId: COMPANY_ID, confirmation: "pharmacie", reason: REASON }),
    );
    expect(result.status).toBe("error");
    expect(CHANGED.deleted).toBe(0);
    expect(CHANGED.audited).toBe(0);
  });

  it("refuse une suspension sans motif (AD-06)", async () => {
    const result = await changeCompanyStatusAction(
      idle,
      form({ companyId: COMPANY_ID, change: "SUSPEND", reason: "" }),
    );
    expect(result.status).toBe("error");
    expect(CHANGED.status).toBe(0);
    expect(CHANGED.audited).toBe(0);
  });

  it("rejette une requête mal formée", async () => {
    const malformed: Record<string, string>[] = [
      { companyId: "pas-un-uuid", change: "SUSPEND", reason: REASON },
      { companyId: COMPANY_ID, change: "DELETE", reason: REASON },
      { companyId: COMPANY_ID, change: "SUSPEND" },
      {},
    ];
    for (const fields of malformed) {
      expect((await changeCompanyStatusAction(idle, form(fields))).status).toBe(
        "error",
      );
    }
    expect(CHANGED.status).toBe(0);
  });
});
