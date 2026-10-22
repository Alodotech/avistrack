import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales du service AvisTrack.",
};

/**
 * Mentions légales.
 *
 * Les champs réglementaires (raison sociale, immatriculation, hébergeur,
 * contact) ne peuvent pas être inventés : ils sont explicitement signalés
 * comme restant à renseigner avant la mise en production.
 */
export default function LegalNoticePage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-2xl border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Mentions légales
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Les informations ci-dessous sont un modèle à compléter avec les
          coordonnées réelles de l&apos;éditeur avant toute mise en ligne.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Éditeur du site</h2>
            <p className="text-gray-600">
              AvisTrack — service de collecte d&apos;avis clients par QR code.
              Raison sociale, forme juridique, capital, adresse du siège et
              numéro d&apos;immatriculation à renseigner.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-gray-600">
              Pour toute question :{" "}
              <a
                href="mailto:contact@avistrack.com"
                className="py-3.5 font-semibold text-black underline-offset-4 hover:underline"
              >
                contact@avistrack.com
              </a>
              .
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Hébergement</h2>
            <p className="text-gray-600">
              Les données du service (base de données, authentification, fichiers)
              sont hébergées sur l&apos;infrastructure Supabase. Les coordonnées
              complètes de l&apos;hébergeur (raison sociale, adresse, téléphone)
              ainsi que l&apos;hébergeur du site sont à renseigner.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Propriété intellectuelle</h2>
            <p className="text-gray-600">
              L&apos;ensemble des éléments du site (interface, textes, logos,
              code) est protégé par le droit de la propriété intellectuelle.
              Toute reproduction sans autorisation est interdite.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Responsabilité</h2>
            <p className="text-gray-600">
              AvisTrack met à disposition un outil de collecte et d&apos;analyse
              d&apos;avis. L&apos;éditeur ne saurait être tenu responsable de
              l&apos;usage fait des données par les commerces utilisateurs.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Médiation</h2>
            <p className="text-gray-600">
              Conformément à l&apos;article L.612-1 du code de la consommation,
              tout consommateur a le droit de recourir gratuitement à un
              médiateur de la consommation en vue de la résolution amiable d&apos;un
              litige. Les coordonnées du médiateur désigné sont à renseigner.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
