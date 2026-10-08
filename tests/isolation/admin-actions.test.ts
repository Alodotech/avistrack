import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_IDS, resetStore } from "@/server/dev/memory-store";
import { listAuditLog } from "@/server/repositories/audit-log-repository";
import { findCompanyById } from "@/server/repositories/company-repository";

/**
 * Les actions Admin sont joignables par un POST direct : elles doivent refuser
 * tout appelant sans session ADMIN, y compris une entreprise connectée.
 */

const session = vi.hoisted(() => ({
  adminId: null as string | null,
  companyId: null as string | null,
}));

vi.mock("@/server/auth/session", () => ({
  getAdminSession: async () =>
    session.adminId ? { adminId: session.adminId } : null,
  getCompanySession: async () =>
    session.companyId ? { companyId: session.companyId } : null,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { changeCompanyStatusAction, deleteCompanyAction } = await import(
  "@/app/(admin)/admin/actions"
);

const idle = { status: "idle" } as const;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const suspendA = () =>
  changeCompanyStatusAction(
    idle,
    form({ companyId: DEV_IDS.companyA, change: "SUSPEND" }),
  );

const auditCount = async () =>
  (await listAuditLog({ page: 1, pageSize: 50 })).total;

beforeEach(() => {
  resetStore();
  session.adminId = null;
  session.companyId = null;
});

describe("autorisation des actions Admin", () => {
  it("refuse un appelant sans session", async () => {
    await expect(suspendA()).rejects.toThrow("REDIRECT:/admin/login");
    expect((await findCompanyById(DEV_IDS.companyA))?.status).toBe("ACTIVE");
  });

  it("refuse une entreprise connectée, même pour agir sur un concurrent", async () => {
    session.companyId = DEV_IDS.companyB;
    await expect(suspendA()).rejects.toThrow("REDIRECT:/admin/login");
    await expect(
      deleteCompanyAction(
        idle,
        form({ companyId: DEV_IDS.companyA, confirmation: "Pharmacie Camp Guézo" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/login");

    expect((await findCompanyById(DEV_IDS.companyA))?.status).toBe("ACTIVE");
    expect(await auditCount()).toBe(0);
  });

  it("refuse une session admin qui ne correspond à aucun administrateur", async () => {
    session.adminId = "99999999-9999-4999-8999-999999999999";
    await expect(suspendA()).rejects.toThrow("REDIRECT:/admin/login");
  });
});

describe("suspension et réactivation (AD-03)", () => {
  beforeEach(() => {
    session.adminId = DEV_IDS.admin;
  });

  it("suspend puis réactive, en journalisant chaque action (AD-06)", async () => {
    expect(await suspendA()).toEqual({ status: "done" });
    expect((await findCompanyById(DEV_IDS.companyA))?.status).toBe("SUSPENDED");
    expect((await findCompanyById(DEV_IDS.companyB))?.status).toBe("ACTIVE");

    const reactivated = await changeCompanyStatusAction(
      idle,
      form({ companyId: DEV_IDS.companyA, change: "REACTIVATE" }),
    );
    expect(reactivated).toEqual({ status: "done" });
    expect((await findCompanyById(DEV_IDS.companyA))?.status).toBe("ACTIVE");

    const { items } = await listAuditLog({ page: 1, pageSize: 50 });
    expect(items.map((entry) => entry.action).sort()).toEqual([
      "REACTIVATE",
      "SUSPEND",
    ]);
    expect(items.every((e) => e.companyName === "Pharmacie Camp Guézo")).toBe(true);
    expect(items.every((e) => e.adminEmail === "admin@avistrack.example")).toBe(true);
  });

  it("n'active pas un compte en attente de vérification e-mail", async () => {
    const result = await changeCompanyStatusAction(
      idle,
      form({ companyId: DEV_IDS.companyPending, change: "REACTIVATE" }),
    );
    expect(result.status).toBe("error");
    expect((await findCompanyById(DEV_IDS.companyPending))?.status).toBe("PENDING");
    expect(await auditCount()).toBe(0);
  });

  it("rejette une requête mal formée", async () => {
    const malformed: Record<string, string>[] = [
      { companyId: "pas-un-uuid", change: "SUSPEND" },
      { companyId: DEV_IDS.companyA, change: "DELETE" },
      {},
    ];
    for (const fields of malformed) {
      const result = await changeCompanyStatusAction(idle, form(fields));
      expect(result.status).toBe("error");
    }
    expect(await auditCount()).toBe(0);
  });
});

describe("suppression (AD-04)", () => {
  beforeEach(() => {
    session.adminId = DEV_IDS.admin;
  });

  it("exige le nom exact de l'entreprise", async () => {
    const result = await deleteCompanyAction(
      idle,
      form({ companyId: DEV_IDS.companyA, confirmation: "pharmacie" }),
    );
    expect(result.status).toBe("error");
    expect(await findCompanyById(DEV_IDS.companyA)).not.toBeNull();
    expect(await auditCount()).toBe(0);
  });

  it("supprime logiquement et journalise, sans toucher aux autres entreprises", async () => {
    const result = await deleteCompanyAction(
      idle,
      form({ companyId: DEV_IDS.companyA, confirmation: "Pharmacie Camp Guézo" }),
    );
    expect(result).toEqual({ status: "done" });
    expect(await findCompanyById(DEV_IDS.companyA)).toBeNull();
    expect(await findCompanyById(DEV_IDS.companyB)).not.toBeNull();

    const { items } = await listAuditLog({ page: 1, pageSize: 50 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      action: "DELETE",
      companyName: "Pharmacie Camp Guézo",
    });
  });
});
