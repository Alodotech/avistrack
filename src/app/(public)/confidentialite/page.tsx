import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment AvisTrack collecte, utilise et protège les données des avis clients.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-2xl border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ce document décrit le traitement des données personnelles liées aux
          avis clients. Il constitue un modèle à adapter au cadre juridique
          applicable.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Données collectées</h2>
            <p className="text-gray-600">
              Lorsqu&apos;un client dépose un avis, le service enregistre la note
              attribuée, le commentaire éventuel, la date de visite et les
              réponses aux questions du formulaire du commerce. Aucun compte
              n&apos;est requis pour déposer un avis.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Finalité du traitement</h2>
            <p className="text-gray-600">
              Les données servent uniquement à afficher les avis et les
              statistiques au commerce concerné, afin d&apos;améliorer la
              qualité de son accueil.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              Isolation stricte par commerce
            </h2>
            <p className="text-gray-600">
              Chaque avis est rattaché à une seule entreprise. Un commerce ne
              peut jamais consulter les avis, les statistiques ou la
              configuration d&apos;un autre commerce.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Durée de conservation</h2>
            <p className="text-gray-600">
              Les avis sont conservés le temps nécessaire au service. La durée
              exacte de conservation reste à préciser.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Vos droits</h2>
            <p className="text-gray-600">
              Vous disposez d&apos;un droit d&apos;accès, de rectification et de
              suppression des données qui vous concernent. Pour l&apos;exercer,
              écrivez à{" "}
              <a
                href="mailto:contact@avistrack.com"
                className="font-semibold text-black underline-offset-4 hover:underline"
              >
                contact@avistrack.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
