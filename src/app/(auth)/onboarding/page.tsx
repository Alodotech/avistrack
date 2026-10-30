import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeletedAccountScreen } from "@/components/auth/deleted-account-screen";
import {
  ADMIN_HOME_PATH,
  COMPANY_HOME_PATH,
} from "@/server/auth/guards";
import { getAccountState } from "@/server/auth/account-state";
import {
  needsCompanyOnboarding,
  needsProfileCompletion,
} from "@/server/services/company-onboarding";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Compléter mon compte" };

/**
 * Finalisation de la fiche entreprise après la première connexion Google.
 *
 * Le compte et la fiche sont créés automatiquement par le callback OAuth. Le
 * téléphone n'est jamais fourni par Google : tant qu'il manque, l'utilisateur
 * termine son inscription ici. Une fois le profil enregistré, l'étape du
 * forfait reste obligatoire : la page reprend à la bonne étape, même après un
 * rechargement.
 */
export default async function OnboardingPage() {
  const state = await getAccountState();

  if (state.kind === "company") {
    if (
      state.company.status === "ACTIVE" &&
      (await needsCompanyOnboarding(state.company))
    ) {
      return (
        <OnboardingForm
          email={state.company.email}
          phone={state.company.phone}
          name={state.company.name}
          initialStep={
            needsProfileCompletion(state.company) ? "profile" : "plan"
          }
        />
      );
    }
    redirect(COMPANY_HOME_PATH);
  }

  if (state.kind === "admin") redirect(ADMIN_HOME_PATH);
  if (state.kind === "deleted") return <DeletedAccountScreen />;

  redirect("/?auth=signup");
}
