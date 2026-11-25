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

export async function hasProcessedFeexPayEvent(
  eventId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feexpay_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function markFeexPayEventProcessed(
  eventId: string,
  name: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("feexpay_webhook_events").upsert(
    { id: eventId, name },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function createPendingFeexPayPayment(input: {
  companyId: string;
  period: Exclude<SubscriptionPeriod, "trial">;
  amount: number;
  providerRef: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("payments").insert({
    company_id: input.companyId,
    plan: "pro",
    period: input.period,
    amount: input.amount,
    status: "pending",
    provider: "feexpay",
    provider_ref: input.providerRef,
  });
  if (error) throw error;
}

export type FeexPayPayment = {
  companyId: string;
  period: string;
  amount: number;
  status: string;
};

export async function findFeexPayPayment(
  providerRef: string,
): Promise<FeexPayPayment | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("company_id, period, amount, status")
    .eq("provider", "feexpay")
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    companyId: data.company_id,
    period: data.period,
    amount: data.amount,
    status: data.status,
  };
}

export async function markFeexPayPaymentFailed(
  providerRef: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("provider", "feexpay")
    .eq("provider_ref", providerRef)
    .eq("status", "pending");
  if (error) throw error;
}

function mapStatus(value: string): SubscriptionStatus {
  return value.toUpperCase() as SubscriptionStatus;
}

function addPeriod(start: Date, period: SubscriptionPeriod): Date | null {
  const end = new Date(start);
  if (period === "trial") end.setUTCDate(end.getUTCDate() + 14);
  else if (period === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
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

async function listAdminGrantedTrialCompanyIds(
  companyIds: string[],
): Promise<Set<string>> {
  if (companyIds.length === 0) return new Set();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("target_id")
    .eq("action", "UPDATE_SUBSCRIPTION")
    .eq("target_type", "company")
    .in("target_id", companyIds)
    .contains("details", { period: "trial" });
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.target_id));
}

export async function hasAdminGrantedTrialSubscription(
  companyId: string,
): Promise<boolean> {
  const companyIds = await listAdminGrantedTrialCompanyIds([companyId]);
  return companyIds.has(companyId);
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
  const adminGrantedTrials = await listAdminGrantedTrialCompanyIds(
    [...map.values()]
      .filter((subscription) => subscription.period === "trial")
      .map((subscription) => subscription.companyId),
  );
  const result: Record<string, SerializedSubscription> = {};
  for (const [key, sub] of map.entries()) {
    result[key] = {
      ...sub,
      startedAt: sub.startedAt.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndDate: sub.trialEndDate?.toISOString(),
      canceledAt: sub.canceledAt?.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      adminGrantedTrial:
        sub.period === "trial" && adminGrantedTrials.has(sub.companyId),
    };
  }
  return result;
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
  if (!input.providerRef.trim()) throw new Error("Référence de paiement manquante.");

  const supabase = createAdminClient();
  const now = new Date();
  const end = addPeriod(now, input.period);
  if (!end) throw new Error("Période d'abonnement invalide.");

  const { data: existingPayment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id, company_id, period, amount, status")
    .eq("provider", input.provider)
    .eq("provider_ref", input.providerRef)
    .maybeSingle();
  if (paymentLookupError) throw paymentLookupError;
  if (existingPayment) {
    if (existingPayment.company_id !== input.companyId) {
      throw new Error("Référence de paiement déjà utilisée par une autre entreprise.");
    }
    if (
      existingPayment.period !== input.period ||
      existingPayment.amount !== input.amount
    ) {
      throw new Error("La référence FeexPay ne correspond pas à cet abonnement.");
    }
    if (existingPayment.status === "paid") {
      const existing = await getCompanySubscription(input.companyId);
      if (existing) return existing;
    }
  }

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

  if (existingPayment) {
    const { error: paymentError } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", existingPayment.id);
    if (paymentError) throw paymentError;
    return toSubscription(data);
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    company_id: input.companyId,
    plan: input.plan,
    period: input.period,
    amount: input.amount,
    status: "paid",
    provider: input.provider,
    provider_ref: input.providerRef,
  });
  if (paymentError) throw paymentError;

  const { error: auditError } = await supabase.from("audit_logs").insert({
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
  });
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
  providerRef: string | null;
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
    providerRef: row.provider_ref,
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
    providerRef: data.provider_ref,
    createdAt: new Date(data.created_at),
  };
}
