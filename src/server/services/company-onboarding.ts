import "server-only";
import type { Company } from "@/server/domain";
import {
  createCompany,
  findCompanyByUserId,
} from "@/server/repositories/company-repository";

/**
 * Onboarding automatique après une première connexion Google (T14).
 *
 * Google fournit le nom et l'e-mail, mais jamais le téléphone professionnel ni
 * la confirmation de l'activité. La fiche est donc créée d'emblée (statut
 * `active`) avec un `public_id` unique ; l'utilisateur complète les champs
 * manquants depuis `/dashboard/profil`.
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
    // Téléphone inconnu à la première connexion : complété dans le profil.
    phone: "",
  });
  return result.ok ? result.company : null;
}
