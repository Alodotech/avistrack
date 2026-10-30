import "server-only";
import type { Company } from "@/server/domain";
import { LOGO_REQUIRED } from "@/lib/company-status";
import {
  createCompany,
  findCompanyByUserId,
} from "@/server/repositories/company-repository";
import { getCompanySubscription } from "@/server/repositories/subscription-repository";

/**
 * Onboarding automatique après une première connexion Google (T14).
 *
 * Google fournit le nom et l'e-mail, mais jamais le téléphone professionnel ni
 * la confirmation de l'activité. La fiche est donc créée d'emblée (statut
 * `active`) avec un `public_id` unique ; l'utilisateur complète les champs
 * manquants sur `/onboarding`.
 */

export type OnboardingUser = {
  id: string;
  email: string | null;
  /** Nom complet renvoyé par Google (`full_name` / `name`). */
  fullName: string | null;
};

/** Devine un nom de structure à partir du profil Google. */
function guessCompanyName(user: OnboardingUser): string {
  const email = user.email ?? "";
  const domain = email.split("@")[1]?.split(".")[0] ?? "";
  if (user.fullName && user.fullName.trim().length >= 2) {
    return user.fullName.trim();
  }
  if (domain.length >= 2) {
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return "Mon commerce";
}

/**
 * Garantit qu'un utilisateur connecté possède une fiche entreprise.
 * Renvoie la fiche existante, ou celle créée à l'instant. `null` si la
 * création échoue (e-mail déjà rattaché à un autre compte).
 */
export async function ensureCompanyForUser(
  user: OnboardingUser,
): Promise<Company | null> {
  const existing = await findCompanyByUserId(user.id);
  if (existing) return existing;

  const result = await createCompany({
    userId: user.id,
    name: guessCompanyName(user),
    email: user.email ?? `utilisateur-${user.id.slice(0, 8)}@avistrack.local`,
    phone: "",
  });
  return result.ok ? result.company : null;
}

/**
 * Étape « profil » : les informations de la fiche sont-elles complètes ?
 * Le logo n'entre dans le calcul que si `LOGO_REQUIRED` est activé.
 */
export function needsProfileCompletion(company: Company): boolean {
  if (company.phone.trim().length === 0) return true;
  if (LOGO_REQUIRED && !company.logoUrl) return true;
  return false;
}

/**
 * L'onboarding n'est terminé que lorsque la fiche est complète **et** qu'un
 * forfait a été enregistré. Sans cette seconde condition, un simple
 * rechargement de page permettait de sauter le choix du forfait et de vivre
 * sur un essai calculé à la volée, jamais persisté.
 */
export async function needsCompanyOnboarding(
  company: Company,
): Promise<boolean> {
  if (needsProfileCompletion(company)) return true;
  const subscription = await getCompanySubscription(company.id);
  return subscription === null;
}
