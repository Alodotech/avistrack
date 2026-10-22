import "server-only";
import type { AuditAction, Page } from "@/server/domain";
import type { AuditLogRow, Json } from "@/types/supabase";
import { createAdminClient } from "@/utils/supabase/admin";

export type AuditLogRowView = {
  id: string;
  action: AuditAction;
  adminEmail: string;
  /** Nom au moment de l'action : reste lisible après suppression de l'entreprise. */
  companyName: string | null;
  /** Motif consigné par l'administrateur (suspension, suppression). */
  reason: string | null;
  createdAt: Date;
};

function readDetail(details: Json, key: string): string | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = details[key];
  return typeof value === "string" ? value : null;
}

export async function recordAdminAction(entry: {
  adminId: string;
  action: AuditAction;
  targetCompanyId: string;
  companyName: string;
  /** Motif de l'action : obligatoire pour une suspension. */
  reason: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: admin } = await supabase
    .from("admins")
    .select("email")
    .eq("user_id", entry.adminId)
    .maybeSingle();

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: entry.adminId,
    action: entry.action,
    target_type: "company",
    target_id: entry.targetCompanyId,
    details: {
      companyName: entry.companyName,
      adminEmail: admin?.email ?? null,
      reason: entry.reason,
    },
  });
  if (error) throw error;
}

export async function listAuditLog(options: {
  page: number;
  pageSize: number;
}): Promise<Page<AuditLogRowView>> {
  const supabase = createAdminClient();
  const from = (options.page - 1) * options.pageSize;

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);
  if (error) throw error;

  const rows: AuditLogRow[] = data ?? [];
  return {
    items: rows.map((entry) => ({
      id: entry.id,
      action: entry.action as AuditAction,
      adminEmail: readDetail(entry.details, "adminEmail") ?? "—",
      companyName: readDetail(entry.details, "companyName"),
      reason: readDetail(entry.details, "reason"),
      createdAt: new Date(entry.created_at),
    })),
    total: count ?? rows.length,
  };
}
