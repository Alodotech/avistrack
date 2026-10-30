import "server-only";
import type {
  CompanySubscription,
  SerializedSubscription,
  SubscriptionPeriod,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/server/domain";
import { getSubscriptionPrice } from "@/lib/pricing";
import { createAdminClient } from "@/utils/supabase/admin";

export const TRIAL_DAYS = 14;

function mapStatus(value: string): SubscriptionStatus {
  return value.toUpperCase() as SubscriptionStatus;
}

function addPeriod(start: Date, period: SubscriptionPeriod): Date | null {
  if (period === "trial") return null;
  const end = new Date(start);
  if (period === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

function toSubscription(row: {
  company_id: string;
  plan: string;
  period: string;
  amount: number;
  status: string;
  started_at: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  updated_at: string;
}): CompanySubscription {
  return {
    companyId: row.company_id,
    plan: row.plan as SubscriptionPlan,
    period: row.period as SubscriptionPeriod,
    amount: row.amount,
    status: mapStatus(row.status),
    startedAt: new Date(row.started_at),
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    trialEndDate: row.trial_ends_at ? new Date(row.trial_ends_at) : undefined,
    canceledAt: row.canceled_at ? new Date(row.canceled_at) : undefined,
    updatedAt: new Date(row.updated_at),
  };
}

/** Abonnement d'une entreprise, ou `null` s'il n'a pas encore été initialisé. */
export async function getCompanySubscription(
  companyId: string,
): Promise<CompanySubscription | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return data ? toSubscription(data) : null;
}

export async function listCompanySubscriptions(
  companyIds: string[],
): Promise<Map<string, CompanySubscription>> {
  const map = new Map<string, CompanySubscription>();
  if (companyIds.length === 0) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("*")
    .in("company_id", companyIds);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.company_id, toSubscription(row));
  return map;
}

export async function getCompanySubscriptions(
  companyIds: string[],
): Promise<Map<string, CompanySubscription>> {
  return listCompanySubscriptions(companyIds);
}

export async function getSerializedCompanySubscriptions(
  companyIds: string[],
): Promise<Record<string, SerializedSubscription>> {
  const map = await listCompanySubscriptions(companyIds);
  const result: Record<string, SerializedSubscription> = {};
  for (const [key, sub] of map.entries()) {
    result[key] = {
      ...sub,
      startedAt: sub.startedAt.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndDate: sub.trialEndDate?.toISOString(),
      canceledAt: sub.canceledAt?.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    };
  }
  return result;
}

export async function ensureTrialSubscription(
  companyId: string,
  startedAt = new Date(),
): Promise<CompanySubscription> {
  const existing = await getCompanySubscription(companyId);
  if (existing) return existing;

  const supabase = createAdminClient();
  const trialEnd = new Date(startedAt);
  trialEnd.setUTCDate(trialEnd.getUTCDate() + TRIAL_DAYS);
  const { data, error } = await supabase
    .from("company_subscriptions")
    .insert({
      company_id: companyId,
      plan: "trial",
      period: "trial",
      amount: 0,
      status: "trialing",
      started_at: startedAt.toISOString(),
      current_period_end: trialEnd?.toISOString() ?? null,
      trial_ends_at: trialEnd?.toISOString() ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toSubscription(data);
}

/** Active un abonnement payant (paiement déjà validé). */
export async function activatePaidSubscription(input: {
  companyId: string;
  plan: "pro";
  period: Exclude<SubscriptionPeriod, "trial">;
  amount: number;
  provider: string;
  providerRef: string;
  actorEmail?: string;
}): Promise<CompanySubscription> {
  const supabase = createAdminClient();
  const now = new Date();
  const end = addPeriod(now, input.period);
  if (!end) throw new Error("Période d'abonnement invalide.");

  const { data, error } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: input.companyId,
        plan: input.plan,
        period: input.period,
        amount: input.amount,
        status: "active",
        started_at: now.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: null,
        canceled_at: null,
        updated_at: now.toISOString(),
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();
  if (error) throw error;

  const [{ error: paymentError }, { error: auditError }] = await Promise.all([
    supabase.from("payments").insert({
      company_id: input.companyId,
      plan: input.plan,
      period: input.period,
      amount: input.amount,
      status: "paid",
      provider: input.provider,
      provider_ref: input.providerRef,
    }),
    supabase.from("audit_logs").insert({
      action: "PAYMENT",
      target_type: "company",
      target_id: input.companyId,
      details: {
        companyName: input.companyId,
        adminEmail: input.actorEmail ?? "client",
        reason: `Paiement ${input.provider} — ${input.period} — ${input.amount} FCFA`,
        plan: input.plan,
        period: input.period,
        amount: input.amount,
        provider: input.provider,
      },
    }),
  ]);

  if (paymentError) throw paymentError;
  if (auditError) throw auditError;
  return toSubscription(data);
}

export async function cancelCompanySubscription(
  companyId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("company_subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("company_id", companyId);
  if (error) throw error;

  await supabase.from("audit_logs").insert({
    action: "UPDATE_SUBSCRIPTION",
    target_type: "company",
    target_id: companyId,
    details: {
      companyName: companyId,
      adminEmail: "client",
      reason: "Résiliation demandée par l'entreprise",
      period: "canceled",
    },
  });
}

/** Attribution manuelle par un administrateur (section Finances). */
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
  const now = new Date();
  const end = addPeriod(now, entry.period);
  const trialEnd = entry.period === "trial" ? end : null;

  const { data, error } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: entry.companyId,
        plan: entry.period === "trial" ? "trial" : "pro",
        period: entry.period,
        amount,
        status: entry.period === "trial" ? "trialing" : "active",
        started_at: now.toISOString(),
        current_period_end: end?.toISOString() ?? null,
        trial_ends_at: trialEnd?.toISOString() ?? null,
        canceled_at: null,
        updated_at: now.toISOString(),
      },
      { onConflict: "company_id" },
    )
    .select("*")
    .single();
  if (error) throw error;

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: entry.adminId,
    action: "UPDATE_SUBSCRIPTION",
    target_type: "company",
    target_id: entry.companyId,
    details: {
      companyName: entry.companyName,
      adminEmail: entry.adminEmail,
      plan: entry.period === "trial" ? "trial" : "pro",
      period: entry.period,
      amount,
      reason: `Attribution abonnement : ${entry.period} - ${amount} FCFA`,
      notes: entry.notes ?? null,
    },
  });
  if (auditError) throw auditError;

  return { ...toSubscription(data), adminEmail: entry.adminEmail };
}

export type PaymentHistoryItem = {
  id: string;
  plan: string;
  period: string;
  amount: number;
  status: string;
  provider: string;
  createdAt: Date;
};

export async function listPayments(
  companyId: string,
): Promise<PaymentHistoryItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    plan: row.plan,
    period: row.period,
    amount: row.amount,
    status: row.status,
    provider: row.provider,
    createdAt: new Date(row.created_at),
  }));
}

export async function findPayment(
  companyId: string,
  paymentId: string,
): Promise<PaymentHistoryItem | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    plan: data.plan,
    period: data.period,
    amount: data.amount,
    status: data.status,
    provider: data.provider,
    createdAt: new Date(data.created_at),
  };
}
