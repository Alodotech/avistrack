import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales du service AvisTrack.",
  alternates: { canonical: "/mentions-legales" },
  openGraph: {
    title: "Mentions légales — AvisTrack",
    description: "Informations légales du service AvisTrack.",
    url: "/mentions-legales",
    images: [
      {
        url: "/opengraph-image",
        alt: "AvisTrack — Collectez et analysez les avis clients par QR code",
      },
    ],
  },
};

export default function LegalNoticePage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-md border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Mentions légales
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Dernière mise à jour : 25 novembre 2026.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Éditeur du site</h2>
            <p className="text-gray-600">
              AvisTrack est édité par ALODO TECH SARL, société à responsabilité
              limitée au capital de 190 000 FCFA, située à Womey Centre,
              Godomey, Abomey-Calavi, Atlantique, Bénin. IFU : 3202628197112.
              RCCM : RB/ABC/26 B 12180 du 28 août 2026.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Direction de publication</h2>
            <p className="text-gray-600">DANDJI Germain.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-gray-600">
              ALODO TECH SARL, Womey Centre, Godomey, Abomey-Calavi,
              Atlantique, Bénin. Téléphone : +229 01 62 71 33 26. Courriel :{" "}
              <a
                href="mailto:contact@avistrack.org"
                className="py-3.5 font-semibold text-black underline-offset-4 hover:underline"
              >
                contact@avistrack.org
              </a>
              .
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Services techniques</h2>
            <p className="text-gray-600">
              Des prestataires spécialisés interviennent pour l&apos;hébergement
              du site, la gestion de la base de données, l&apos;authentification,
              le stockage applicatif et le traitement des paiements. Ils
              fournissent les services techniques nécessaires au fonctionnement
              d&apos;AvisTrack.
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

        </div>
      </div>
    </article>
  );
}
