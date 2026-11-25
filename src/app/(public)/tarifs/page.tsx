import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Découvrez les tarifs AvisTrack : une offre Pro à 3 500 FCFA par mois ou 35 000 FCFA par an.",
  alternates: { canonical: "/tarifs" },
  openGraph: {
    title: "Tarifs AvisTrack",
    description:
      "Une offre Pro à 3 500 FCFA par mois ou 35 000 FCFA par an.",
    locale: "fr_FR",
    type: "website",
    siteName: "AvisTrack",
  },
};

export default function PricingPage() {
  return <Pricing />;
}
