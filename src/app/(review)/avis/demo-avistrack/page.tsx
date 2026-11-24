import type { Metadata } from "next";
import { connection } from "next/server";
import { withFormDefaults } from "@/lib/review-form";
import { ReviewForm } from "../[publicId]/review-form";

export const metadata: Metadata = {
  title: "Votre avis — démonstration",
  description: "Démonstration du formulaire d'avis AvisTrack.",
  robots: { index: false, follow: false },
};

/**
 * Cible du QR code affiché sur la page d'accueil (« Pharmacie du Centre »).
 *
 * Route statique volontairement placée avant `[publicId]` : le visiteur peut
 * tester le parcours complet sans qu'un faux avis soit enregistré en base.
 */
export default async function DemoReviewPage() {
  await connection();
  const maxDate = new Date().toISOString().slice(0, 10);

  return (
    <ReviewForm
      companyName="Pharmacie du Centre — démo"
      publicId="demo-avistrack"
      config={withFormDefaults(null)}
      maxDate={maxDate}
      demo
    />
  );
}
