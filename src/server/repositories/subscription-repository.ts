import "server-only";
import type {
  CompanySubscription,
  SerializedSubscription,
  SubscriptionPeriod,
} from "@/server/domain";
import { getSubscriptionPrice } from "@/lib/pricing";
import type { AuditLogRow, Json } from "@/types/supabase";
import { createAdminClient } from "@/utils/supabase/admin";

function readDetail(details: Json, key: string): string | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = details[key];
  return typeof value === "string" ? value : null;
}

function readDetailNumber(details: Json, key: string): number | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const value = details[key];
  return typeof value === "number" ? value : null;
}

/**
 * Récupère le dernier état d'abonnement consigné pour chaque entreprise.
 * Par défaut, toute entreprise sans entrée explicite est en période d'essai gratuit (14j).
 */
export async function getCompanySubscriptions(
  companyIds: string[],
): Promise<Map<string, CompanySubscription>> {
  const map = new Map<string, CompanySubscription>();
  if (companyIds.length === 0) return map;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("action", "UPDATE_SUBSCRIPTION")
    .eq("target_type", "company")
    .in("target_id", companyIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des abonnements:", error);
    return map;
  }

  const rows: AuditLogRow[] = data ?? [];

  for (const row of rows) {
    const companyId = row.target_id;
    if (map.has(companyId)) continue; // Ne garder que la plus récente

    const period = (readDetail(row.details, "period") as SubscriptionPeriod) || "trial";
    const amount = readDetailNumber(row.details, "amount") ?? getSubscriptionPrice(period);
    const adminEmail = readDetail(row.details, "adminEmail") ?? undefined;

    map.set(companyId, {
      companyId,
      plan: period === "trial" ? "trial" : "pro",
      period,
      amount,
      updatedAt: new Date(row.created_at),
      adminEmail,
    });
  }

  return map;
}

/**
 * Enregistre ou met à jour la formule d'abonnement d'une entreprise dans le journal d'audit.
 */
export async function setCompanySubscription(entry: {
  adminId: string;
  adminEmail: string;
  companyId: string;
  companyName: string;
  period: SubscriptionPeriod;
  notes?: string;
}): Promise<CompanySubscription> {
  const supabase = createAdminClient();

  const amount = getSubscriptionPrice(entry.period);
  const periodLabel =
    entry.period === "annual"
      ? "Abonnement Annuel (12 mois)"
      : entry.period === "monthly"
      ? "Abonnement Mensuel"
      : "Période d'essai gratuit (14j)";

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: entry.adminId,
    action: "UPDATE_SUBSCRIPTION",
    target_type: "company",
    target_id: entry.companyId,
    details: {
      companyName: entry.companyName,
      adminEmail: entry.adminEmail,
      plan: entry.period === "trial" ? "trial" : "AvisTrack",
      period: entry.period,
      amount,
      reason: `Attribution abonnement : ${periodLabel} - ${amount} FCFA`,
      notes: entry.notes ?? null,
    },
  });

  if (error) throw error;

  return {
    companyId: entry.companyId,
    plan: entry.period === "trial" ? "trial" : "pro",
    period: entry.period,
    amount,
    updatedAt: new Date(),
    adminEmail: entry.adminEmail,
  };
}

export async function getSerializedCompanySubscriptions(
  companyIds: string[],
): Promise<Record<string, SerializedSubscription>> {
  const map = await getCompanySubscriptions(companyIds);
  const result: Record<string, SerializedSubscription> = {};
  for (const [key, sub] of map.entries()) {
    result[key] = {
      ...sub,
      updatedAt: sub.updatedAt.toISOString(),
    };
  }
  return result;
}
