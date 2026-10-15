import "server-only";
import { withFormDefaults } from "@/lib/review-form";
import { getStore } from "@/server/dev/memory-store";
import type { ReviewFormConfig } from "@/server/domain";

/**
 * Accès à la personnalisation du formulaire d'avis (Form studio).
 *
 * Comme les avis, la configuration est strictement cloisonnée par entreprise :
 * `companyId` doit venir de la session serveur, jamais de la requête.
 */

function assertCompanyId(companyId: string): void {
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("companyId est obligatoire pour lire ou écrire le formulaire.");
  }
}

export async function getReviewFormConfig(
  companyId: string,
): Promise<ReviewFormConfig> {
  assertCompanyId(companyId);
  return withFormDefaults(getStore().formConfigs[companyId]);
}

export async function updateReviewFormConfig(
  companyId: string,
  config: ReviewFormConfig,
): Promise<ReviewFormConfig> {
  assertCompanyId(companyId);
  getStore().formConfigs[companyId] = config;
  return config;
}
