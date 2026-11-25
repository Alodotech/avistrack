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

export async function recordAdminTeamAction(entry: {
  adminId: string;
  action:
    | "INVITE_ADMIN"
    | "UPDATE_ADMIN_ROLE"
    | "REMOVE_ADMIN"
    | "CREATE_ROLE"
    | "UPDATE_ROLE";
  targetEmail: string;
  role?: string;
  reason?: string;
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
    target_type:
      entry.action === "CREATE_ROLE" || entry.action === "UPDATE_ROLE"
        ? "role"
        : "admin",
    target_id: entry.targetEmail,
    details: {
      companyName: `Équipe AvisTrack (${entry.targetEmail})`,
      adminEmail: admin?.email ?? null,
      reason: entry.reason ?? (entry.role ? `Rôle : ${entry.role === "dirigeant" ? "Dirigeant AvisTrack" : "Administrateur"}` : null),
    },
  });
  if (error) throw error;
}

function cleanSearch(value: string): string {
  return value.replace(/[,()%]/g, " ").trim();
}

export async function listAuditLog(options: {
  page: number;
  pageSize: number;
  from?: Date;
  to?: Date;
  action?: AuditAction;
  query?: string;
  periodDays?: number;
  now?: Date;
}): Promise<Page<AuditLogRowView>> {
  const supabase = createAdminClient();
  const from = (options.page - 1) * options.pageSize;

  const fromDate =
    options.from ??
    (options.periodDays
      ? new Date(
          (options.now ?? new Date()).getTime() -
            (options.periodDays - 1) * 24 * 60 * 60 * 1000,
        )
      : undefined);
  if (fromDate) fromDate.setUTCHours(0, 0, 0, 0);

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" });
  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (options.to) query = query.lte("created_at", options.to.toISOString());
  if (options.action) query = query.eq("action", options.action);
  if (options.query) {
    const term = cleanSearch(options.query);
    if (term) {
      query = query.or(
        `details->>companyName.ilike.%${term}%,details->>adminEmail.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
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
