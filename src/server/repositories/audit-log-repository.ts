import "server-only";
import { getStore } from "@/server/dev/memory-store";
import type { AuditAction, Page } from "@/server/domain";

export type AuditLogRow = {
  id: string;
  action: AuditAction;
  adminEmail: string;
  /** Nom au moment de l'action : reste lisible après suppression de l'entreprise. */
  companyName: string | null;
  createdAt: Date;
};

export async function recordAdminAction(entry: {
  adminId: string;
  action: AuditAction;
  targetCompanyId: string;
  companyName: string;
}): Promise<void> {
  const store = getStore();
  store.auditLog.push({
    id: crypto.randomUUID(),
    adminId: entry.adminId,
    action: entry.action,
    targetCompanyId: entry.targetCompanyId,
    metadata: { companyName: entry.companyName },
    createdAt: new Date(),
  });
}

export async function listAuditLog(options: {
  page: number;
  pageSize: number;
}): Promise<Page<AuditLogRow>> {
  const { auditLog, admins } = getStore();
  const sorted = [...auditLog].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const start = (options.page - 1) * options.pageSize;

  return {
    items: sorted.slice(start, start + options.pageSize).map((entry) => ({
      id: entry.id,
      action: entry.action,
      adminEmail:
        admins.find((admin) => admin.id === entry.adminId)?.email ?? "—",
      companyName: entry.metadata.companyName ?? null,
      createdAt: entry.createdAt,
    })),
    total: sorted.length,
  };
}
