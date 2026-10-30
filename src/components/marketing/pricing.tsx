"use client";

import { useState } from "react";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { formatCurrency } from "@/lib/format";
import {
  AVIS_TRACK_ANNUAL_SAVINGS,
  AVIS_TRACK_PRICING,
} from "@/lib/pricing";

type Period = "monthly" | "annual";

type Plan = {
  id: "trial" | "pro";
  name: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Essai gratuit",
    description: "14 jours pour tester AvisTrack et poser votre premier QR code.",
    features: [
      "1 établissement",
      "QR code et avis illimités",
      "Formulaire d'avis personnalisable",
      "Tableau de bord complet",
      "Sans carte bancaire",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Pour les commerces qui veulent suivre leur satisfaction.",
    features: [
      "Tout le plan Gratuit",
      "Jusqu'à 5 établissements",
      "Statistiques avancées",
      "Export des avis en CSV",
      "Support prioritaire",
    ],
    highlighted: true,
  },
];

const COMPARISON = [
  { feature: "Établissements", trial: "1", pro: "Jusqu'à 5" },
  { feature: "QR code et avis", trial: "Illimités", pro: "Illimités" },
  { feature: "Formulaire personnalisable", trial: "Oui", pro: "Oui" },
  { feature: "Avis anonymes ou identifiés", trial: "Oui", pro: "Oui" },
  { feature: "Remarques privées", trial: "Oui", pro: "Oui" },
  { feature: "Tableau de bord et tendances", trial: "Oui", pro: "Oui" },
  { feature: "Export des avis", trial: "Non", pro: "CSV" },
  { feature: "Affiche QR A6", trial: "Oui", pro: "Oui" },
  { feature: "Support", trial: "E-mail", pro: "Prioritaire" },
  { feature: "Engagement", trial: "14 jours, sans carte", pro: "Sans engagement" },
];

const FAQ = [
  {
    question: "L'essai gratuit demande-t-il une carte bancaire ?",
    answer:
      "Non. L'essai de 14 jours s'active depuis votre espace, sans aucun moyen de paiement. À la fin de l'essai, vous choisissez votre offre ou votre accès se ferme.",
  },
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
  const [period, setPeriod] = useState<Period>("monthly");
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
            Commencez gratuitement, passez au Pro quand votre activité se
            développe. Sans engagement, sans carte bancaire pour l&apos;essai.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div
            role="group"
            aria-label="Période de facturation"
            className="inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              aria-pressed={period === "monthly"}
              onClick={() => setPeriod("monthly")}
              className={`min-h-10 cursor-pointer rounded-full px-5 text-sm font-semibold transition-colors ${
                period === "monthly"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              aria-pressed={period === "annual"}
              onClick={() => setPeriod("annual")}
              className={`min-h-10 cursor-pointer rounded-full px-5 text-sm font-semibold transition-colors ${
                period === "annual"
                  ? "bg-red text-white"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Annuel
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2 lg:items-stretch">
          {PLANS.map((plan) => {
            const price =
              plan.id === "trial"
                ? AVIS_TRACK_PRICING.trial
                : period === "annual"
                  ? AVIS_TRACK_PRICING.annual
                  : AVIS_TRACK_PRICING.monthly;

            return (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 ${
                  plan.highlighted
                    ? "order-1 border-red/40 bg-white shadow-[0_24px_60px_-28px_rgba(215,25,32,0.55)] lg:order-2 lg:-translate-y-4"
                    : "order-2 border-black/10 bg-white/65 lg:order-1"
                }`}
              >
                {plan.highlighted ? (
                  <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-red/10 px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-red uppercase">
                    <span aria-hidden className="size-1.5 rounded-full bg-red" />
                    Essai gratuit 14 jours
                  </span>
                ) : null}

                <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
                  {plan.description}
                </p>

                <div className="mt-6 flex min-h-28 flex-col justify-end">
                  <div
                    key={`${plan.id}-${period}`}
                    className="pricing-price flex flex-col gap-1"
                  >
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                        {formatCurrency(price)}
                      </span>
                      {plan.id === "trial" ? (
                        <span className="text-sm font-medium text-gray-600">
                          pendant 14 jours
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {period === "annual" ? "/ an" : "/ mois"}
                        </span>
                      )}
                    </p>
                    {plan.id === "pro" && period === "annual" ? (
                      <p className="text-xs text-gray-600">
                        {formatCurrency(AVIS_TRACK_ANNUAL_SAVINGS)} d&apos;économie
                        par rapport au mensuel
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">
                        {plan.id === "trial"
                          ? "Sans carte bancaire"
                          : "Sans engagement"}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openSignup}
                  className={`mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-red text-white hover:bg-red/80"
                      : "border border-black bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  {plan.highlighted
                    ? "Démarrer mon essai gratuit"
                    : "Commencer l'essai gratuit"}
                </button>

                <ul className="mt-7 flex flex-col gap-3 border-t border-black/10 pt-6 text-sm">
                  {plan.features.map((feature) => (
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

        <section aria-labelledby="pricing-compare" className="mt-16 lg:mt-20">
          <h3
            id="pricing-compare"
            className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Comparer les plans
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-600">
            Les mêmes outils de collecte dans les deux offres ; le Pro lève les
            limites et ajoute les exports.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">
                Comparaison de l&apos;essai gratuit et du plan Pro
              </caption>
              <thead className="bg-gray-50 text-left text-xs tracking-wide text-gray-600 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Fonctionnalité
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Essai gratuit
                  </th>
                  <th scope="col" className="px-5 py-3 text-red">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-t border-black/10">
                    <th scope="row" className="px-5 py-3 text-left font-semibold">
                      {row.feature}
                    </th>
                    <td className="px-5 py-3 text-gray-600">{row.trial}</td>
                    <td className="px-5 py-3 font-semibold">{row.pro}</td>
                  </tr>
                ))}
                <tr className="border-t border-black/10 bg-gray-50">
                  <th scope="row" className="px-5 py-3 text-left font-semibold">
                    Prix
                  </th>
                  <td className="px-5 py-3 text-gray-600">Gratuit 14 jours</td>
                  <td className="px-5 py-3 font-semibold">
                    {formatCurrency(AVIS_TRACK_PRICING.monthly)} / mois ou{" "}
                    {formatCurrency(AVIS_TRACK_PRICING.annual)} / an
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

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
