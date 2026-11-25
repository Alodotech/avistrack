import "server-only";
import type { Admin } from "@/server/domain";
import { createAdminClient } from "@/utils/supabase/admin";

export type ReportDownload = {
  id: string;
  adminEmail: string;
  period: string;
  label: string;
  format: "pdf" | "excel" | "csv";
  createdAt: Date;
};

export async function recordReportDownload(input: {
  admin: Admin;
  period: string;
  label: string;
  format: "pdf" | "excel" | "csv";
}): Promise<void> {
  const supabase = createAdminClient();

  const [downloadResult, auditResult] = await Promise.all([
    supabase.from("report_downloads").insert({
      admin_id: adminUserId(input.admin),
      admin_email: input.admin.email,
      period: input.period,
      label: input.label,
      format: input.format,
    }),
    supabase.from("audit_logs").insert({
      actor_id: adminUserId(input.admin),
      action: "DOWNLOAD_REPORT",
      target_type: "report",
      target_id: `${input.period}:${input.label}`,
      details: {
        adminEmail: input.admin.email,
        companyName: `Rapport ${input.label}`,
        reason: `Export ${input.format.toUpperCase()}`,
        format: input.format,
        period: input.period,
      },
    }),
  ]);

  if (downloadResult.error) throw downloadResult.error;
  if (auditResult.error) throw auditResult.error;
}

/**
 * `Admin.id` porte l'identifiant Supabase Auth (`user_id`) dans le modèle
 * métier. Les lignes d'audit stockent ce même identifiant dans `actor_id`.
 */
function adminUserId(admin: Admin): string | null {
  return admin.id || null;
}

export async function listReportDownloads(options: {
  page: number;
  pageSize: number;
}): Promise<{ items: ReportDownload[]; total: number }> {
  const supabase = createAdminClient();
  const from = (options.page - 1) * options.pageSize;
  const { data, error, count } = await supabase
    .from("report_downloads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + options.pageSize - 1);
  if (error) throw error;

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      adminEmail: row.admin_email,
      period: row.period,
      label: row.label,
      format: row.format,
      createdAt: new Date(row.created_at),
    })),
    total: count ?? 0,
  };
}
