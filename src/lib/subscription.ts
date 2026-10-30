import type {
  CompanySubscription,
  SubscriptionStatus,
} from "@/server/domain";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Essai en cours",
  ACTIVE: "Actif",
  CANCELED: "Résilié",
  EXPIRED: "Expiré",
  SUSPENDED: "Suspendu",
};

export const SUBSCRIPTION_PERIOD_LABELS = {
  trial: "Essai gratuit",
  monthly: "Pro mensuel",
  annual: "Pro annuel",
} as const;

export type SubscriptionView = {
  status: SubscriptionStatus;
  statusLabel: string;
  planLabel: string;
  modeLabel: string;
  daysRemaining: number | null;
  isExpired: boolean;
  isEndingSoon: boolean;
  endDate: Date | null;
};

function endDate(subscription: CompanySubscription): Date | null {
  return subscription.currentPeriodEnd ?? subscription.trialEndDate ?? null;
}

export function viewSubscription(
  subscription: CompanySubscription,
  now: Date,
): SubscriptionView {
  const end = endDate(subscription);
  const daysRemaining = end
    ? Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
    : null;

  let status = subscription.status;
  if (
    (status === "TRIALING" || status === "ACTIVE" || status === "CANCELED") &&
    end &&
    end.getTime() < now.getTime()
  ) {
    status = "EXPIRED";
  }

  return {
    status,
    statusLabel: SUBSCRIPTION_STATUS_LABELS[status],
    planLabel: subscription.plan === "pro" ? "Pro" : "Essai",
    modeLabel: SUBSCRIPTION_PERIOD_LABELS[subscription.period],
    daysRemaining,
    isExpired: status === "EXPIRED",
    isEndingSoon:
      status === "TRIALING" && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0,
    endDate: end,
  };
}

export function defaultTrialSubscription(
  companyId: string,
  createdAt: Date,
  now: Date,
): CompanySubscription {
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + 14);
  return {
    companyId,
    plan: "trial",
    period: "trial",
    amount: 0,
    status: trialEnd.getTime() < now.getTime() ? "EXPIRED" : "TRIALING",
    startedAt: createdAt,
    currentPeriodEnd: trialEnd,
    trialEndDate: trialEnd,
    updatedAt: createdAt,
  };
}
