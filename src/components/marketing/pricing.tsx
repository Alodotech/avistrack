"use client";

import { useAuthModal } from "@/components/auth/auth-modal-context";
import { formatCurrency } from "@/lib/format";
import {
  AVIS_TRACK_ANNUAL_SAVINGS,
  AVIS_TRACK_PRICING,
} from "@/lib/pricing";

type PricingOption = {
  id: "monthly" | "annual";
  name: string;
  description: string;
  price: number;
  periodLabel: string;
  highlighted?: boolean;
};

const PRICING_OPTIONS: PricingOption[] = [
  {
    id: "monthly",
    name: "Pro mensuel",
    description: "Pour avancer à votre rythme, avec un paiement chaque mois.",
    price: AVIS_TRACK_PRICING.monthly,
    periodLabel: "par mois",
  },
  {
    id: "annual",
    name: "Pro annuel",
    description: `Un paiement par an, avec une remise de ${formatCurrency(AVIS_TRACK_ANNUAL_SAVINGS)}.`,
    price: AVIS_TRACK_PRICING.annual,
    periodLabel: "par an",
    highlighted: true,
  },
];

const PRO_FEATURES = [
  "1 entreprise",
  "QR code et avis illimités",
  "Formulaire d'avis personnalisable",
  "Tableau de bord et statistiques avancées",
  "Export complet des avis en CSV, PDF et Excel",
  "Support prioritaire",
];

const FAQ = [
  {
    question: "Que se passe-t-il quand mon abonnement expire ?",
    answer:
      "Le tableau de bord, le QR code et les avis se ferment, mais votre compte et vos données restent conservés. Il suffit de renouveler depuis la page Abonnement pour tout rouvrir.",
  },
  {
    question: "Puis-je changer d'offre en cours d'année ?",
    answer:
      "Oui, à tout moment depuis votre espace : passage du mensuel à l'annuel, renouvellement ou résiliation. L'accès reste ouvert jusqu'à la fin de la période déjà réglée.",
  },
  {
    question: "Mes avis sont-ils visibles par d'autres entreprises ?",
    answer:
      "Non. Chaque avis est rattaché à une seule entreprise et les politiques de sécurité de la base empêchent toute lecture croisée entre comptes.",
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0 text-red"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function Pricing() {
  const { openSignup } = useAuthModal();

  return (
    <section
      id="tarifs"
      aria-labelledby="pricing-title"
      className="px-6 py-20 text-black sm:py-24 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-red uppercase">
            Tarifs
          </p>
          <h2
            id="pricing-title"
            className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Des tarifs simples, sans surprise.
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Choisissez l&apos;offre Pro et sa facturation mensuelle ou annuelle
            selon les besoins de votre entreprise.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 md:items-stretch">
          {PRICING_OPTIONS.map((option) => {
            return (
              <article
                key={option.id}
                className={`relative flex h-full flex-col rounded-md border p-6 sm:p-7 ${
                  option.highlighted
                    ? "border-red/40 bg-white shadow-[0_24px_60px_-28px_rgba(215,25,32,0.55)] md:-translate-y-4"
                    : "border-black/10 bg-white/65"
                }`}
              >
                <h3 className="text-xl font-bold tracking-tight">
                  {option.name}
                </h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
                  {option.description}
                </p>

                <div className="pricing-price mt-6 flex min-h-28 flex-col justify-end gap-1">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                      {formatCurrency(option.price)}
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      {option.periodLabel}
                    </span>
                  </p>
                  {option.id === "annual" ? (
                    <p className="text-xs text-gray-600">
                      Économisez {formatCurrency(AVIS_TRACK_ANNUAL_SAVINGS)} par
                      rapport au mensuel
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-600">
                      Sans engagement
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openSignup}
                  className={`mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
                    option.highlighted
                      ? "bg-red text-white hover:bg-red/80"
                      : "border border-black bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  Créer mon compte
                </button>

                <ul className="mt-7 flex flex-col gap-3 border-t border-black/10 pt-6 text-sm">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <section aria-labelledby="pricing-faq" className="mt-16 lg:mt-20">
          <h3
            id="pricing-faq"
            className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Questions fréquentes
          </h3>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-black/10 bg-white p-5"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-black">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
