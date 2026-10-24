import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeletedAccountScreen } from "@/components/auth/deleted-account-screen";
import {
  ADMIN_HOME_PATH,
  COMPANY_HOME_PATH,
  COMPANY_LOGIN_PATH,
} from "@/server/auth/guards";
import { getAccountState } from "@/server/auth/account-state";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Créer mon compte" };

/**
 * Création de la fiche entreprise.
 *
 * Réservée aux sessions authentifiées sans fiche entreprise : un visiteur
 * anonyme est renvoyé vers la connexion, une entreprise existante vers son
 * tableau de bord, un administrateur vers l'espace d'administration.
 */
export default async function OnboardingPage() {
  const state = await getAccountState();

  if (state.kind === "anonymous") redirect(COMPANY_LOGIN_PATH);
  if (state.kind === "company") redirect(COMPANY_HOME_PATH);
  if (state.kind === "admin") redirect(ADMIN_HOME_PATH);
  if (state.kind === "deleted") return <DeletedAccountScreen />;

  return <OnboardingForm />;
}
