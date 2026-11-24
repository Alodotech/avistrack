import "server-only";
import type { Company, CompanySubscription } from "@/server/domain";
import {
  getCompanySubscription,
  hasAdminGrantedTrialSubscription,
} from "@/server/repositories/subscription-repository";
import {
  isSubscriptionAccessBlocked,
  viewSubscription,
  type SubscriptionView,
} from "@/lib/subscription";

/** Abonnement réellement attribué à l'entreprise, s'il existe. */
export async function getCompanySubscriptionView(
  company: Company,
  now = new Date(),
): Promise<{ subscription: CompanySubscription; view: SubscriptionView } | null> {
  const stored = await getCompanySubscription(company.id);
  if (!stored) return null;
  if (
    stored.period === "trial" &&
    !(await hasAdminGrantedTrialSubscription(company.id))
  ) {
    return null;
  }
  return { subscription: stored, view: viewSubscription(stored, now) };
}

/**
 * Sans abonnement, expiré ou suspendu, l'accès aux fonctionnalités est fermé.
 */
export async function isCompanyAccessBlocked(
  company: Company,
  now = new Date(),
): Promise<boolean> {
  const subscription = await getCompanySubscription(company.id);
  if (
    subscription?.period === "trial" &&
    !(await hasAdminGrantedTrialSubscription(company.id))
  ) {
    return true;
  }
  return isSubscriptionAccessBlocked(subscription, now);
}
