import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment AvisTrack collecte, utilise et protège les données des avis clients.",
  alternates: { canonical: "/confidentialite" },
  openGraph: {
    title: "Politique de confidentialité — AvisTrack",
    description:
      "Comment AvisTrack collecte, utilise et protège les données des avis clients.",
    url: "/confidentialite",
    images: [
      {
        url: "/opengraph-image",
        alt: "AvisTrack — Collectez et analysez les avis clients par QR code",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Politique de confidentialité — AvisTrack",
    description:
      "Comment AvisTrack collecte, utilise et protège les données des avis clients.",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-md border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Dernière mise à jour : 25 novembre 2026.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Responsable du traitement</h2>
            <p className="text-gray-600">
              ALODO TECH SARL, Womey Centre, Godomey, Abomey-Calavi,
              Atlantique, Bénin. Contact : +229 01 62 71 33 26 ou{" "}
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
            <h2 className="text-base font-semibold">Données collectées</h2>
            <p className="text-gray-600">
              Selon le formulaire et les choix du visiteur, un avis peut
              contenir une note, un commentaire, une date de visite, des
              réponses aux questions du commerce, ainsi qu&apos;un prénom, un
              nom, un numéro de téléphone ou une adresse e-mail. Les champs
              d&apos;identité sont facultatifs lorsqu&apos;ils ne sont pas
              rendus obligatoires par le formulaire du commerce.
            </p>
            <p className="text-gray-600">
              Pour les comptes professionnels, AvisTrack traite notamment le
              nom de l&apos;entreprise, les coordonnées du compte, le pays, les
              données de connexion et, si fourni, le logo. Le suivi des
              paiements comprend le montant, la formule, le statut et la
              référence de transaction. Les données de carte sont traitées par
              le prestataire de paiement et ne sont pas enregistrées par
              AvisTrack.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Finalité du traitement</h2>
            <p className="text-gray-600">
              Les données permettent de fournir le service, afficher les avis
              et statistiques au commerce concerné, gérer les comptes et les
              abonnements, traiter les paiements, sécuriser la plateforme et
              répondre aux demandes. Les données d&apos;avis ne sont pas
              revendues ni utilisées pour de la publicité ciblée par AvisTrack.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              Isolation stricte par commerce
            </h2>
            <p className="text-gray-600">
              Chaque avis est rattaché à une seule entreprise. Un commerce ne
              peut jamais consulter les avis, les statistiques ou la
              configuration d&apos;un autre commerce. Cette isolation est
              appliquée par la base de données elle-même, et non par l&apos;application :
              une requête directe à l&apos;API sans le bon contexte est
              rejetée.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Durée de conservation</h2>
            <p className="text-gray-600">
              Après l&apos;expiration d&apos;un abonnement, les données du
              compte sont conservées pendant trois mois. Sans renouvellement
              durant cette période, l&apos;entreprise, ses avis, ses données de
              paiement et son compte de connexion sont supprimés définitivement
              par un traitement automatique quotidien. Une demande de
              suppression du compte conserve les données associées pendant
              30 jours avant leur effacement définitif.
            </p>
            <p className="text-gray-600">
              Les cookies de session nécessaires servent à l&apos;authentification
              et à la sécurité. Le choix relatif aux statistiques est enregistré
              dans le navigateur. Les données nécessaires au fonctionnement ne
              sont pas utilisées pour du suivi publicitaire.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Sous-traitants</h2>
            <p className="text-gray-600">
              Des prestataires spécialisés interviennent pour l&apos;hébergement
              et le déploiement du site, la base de données,
              l&apos;authentification, le stockage applicatif et le traitement
              des paiements. Un fournisseur externe peut aussi intervenir si le
              visiteur choisit une méthode de connexion tierce. Les statistiques
              d&apos;audience agrégées ne sont mesurées qu&apos;après
              consentement. Chaque prestataire n&apos;accède qu&apos;aux données
              nécessaires à sa mission.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              Statistiques et préférences cookies
            </h2>
            <p className="text-gray-600">
              Les statistiques d&apos;audience ne sont activées qu&apos;après
              acceptation dans le bandeau de préférences. Vous pouvez modifier
              votre choix à tout moment avec le lien « Préférences cookies »
              en bas de page. Le refus des statistiques ne bloque pas les
              fonctions nécessaires du site.
            </p>
          </section>

          <section id="donnees" className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Vos droits</h2>
            <p className="text-gray-600">
              Pour demander des informations, accéder à vos données, les faire
              corriger ou demander leur suppression, contactez ALODO TECH SARL.
              Les demandes sont traitées selon la réglementation applicable.
              Vous pouvez également saisir l&apos;autorité de contrôle compétente.
              Contact :{" "}
              <a
                href="mailto:contact@avistrack.org"
                className="py-3.5 font-semibold text-black underline-offset-4 hover:underline"
              >
                contact@avistrack.org
              </a>
              {" "}ou +229 01 62 71 33 26.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
