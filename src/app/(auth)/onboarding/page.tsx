import type { Metadata } from "next";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Créer mon compte" };

export default function OnboardingPage() {
  return <OnboardingForm />;
}
