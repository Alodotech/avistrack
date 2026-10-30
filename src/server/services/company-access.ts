import "server-only";
import type { Company, CompanySubscription } from "@/server/domain";
import {
  defaultTrialSubscription,
  viewSubscription,
  type SubscriptionView,
} from "@/lib/subscription";
import { getCompanySubscription } from "@/server/repositories/subscription-repository";

/**
 * Abonnement de l'entreprise, réel ou essai par défaut.
 *
 * L'essai calculé à la volée ne sert qu'à l'affichage : dès qu'une ligne existe
 * dans `company_subscriptions`, c'est elle qui fait foi.
 */
export async function getCompanySubscriptionView(
  company: Company,
  now = new Date(),
): Promise<{ subscription: CompanySubscription; view: SubscriptionView }> {
  const stored = await getCompanySubscription(company.id);
  const subscription =
    stored ?? defaultTrialSubscription(company.id, company.createdAt, now);
  return { subscription, view: viewSubscription(subscription, now) };
}

/**
 * Un abonnement expiré ou suspendu ferme l'accès aux fonctionnalités
 * (QR, avis, studio). Seuls le profil et la page d'abonnement restent ouverts.
 */
export async function isCompanyAccessBlocked(
  company: Company,
  now = new Date(),
): Promise<boolean> {
  const { view } = await getCompanySubscriptionView(company, now);
  return view.isExpired || view.status === "SUSPENDED";
}
