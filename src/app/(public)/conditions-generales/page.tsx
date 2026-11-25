import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales",
  description:
    "Conditions d'utilisation et d'abonnement au service AvisTrack.",
};

const SECTION_CLASS = "flex flex-col gap-2";
const HEADING_CLASS = "text-base font-semibold";
const BODY_CLASS = "text-gray-600";

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-md border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Conditions générales d&apos;utilisation et de vente
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Dernière mise à jour : 25 novembre 2026.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>1. Éditeur et objet</h2>
            <p className={BODY_CLASS}>
              AvisTrack est un service édité par ALODO TECH SARL, société à
              responsabilité limitée établie à Womey Centre, Godomey,
              Abomey-Calavi, Atlantique, Bénin. Le service permet aux
              professionnels de recueillir et consulter les avis de leurs
              clients au moyen d&apos;un QR code et d&apos;un tableau de bord.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>2. Création et sécurité du compte</h2>
            <p className={BODY_CLASS}>
              Le client fournit des informations exactes, maintient ses
              coordonnées à jour et protège ses moyens de connexion. Il est
              responsable des actions réalisées depuis son compte et de
              l&apos;utilisation du service par les personnes qu&apos;il autorise.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>3. Abonnements et tarifs</h2>
            <p className={BODY_CLASS}>
              Les formules actuellement proposées sont de 3 500 FCFA pour un
              mois et de 35 000 FCFA pour un an. Le tarif et la durée applicables
              sont ceux affichés au moment du paiement. Le tableau de bord est
              activé après confirmation du paiement par le prestataire de
              paiement.
            </p>
            <p className={BODY_CLASS}>
              Le renouvellement est manuel : aucun prélèvement automatique
              n&apos;est effectué. Le client doit effectuer un nouveau paiement
              avant la fin de sa période pour maintenir l&apos;accès.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>4. Expiration, résiliation et données</h2>
            <p className={BODY_CLASS}>
              À l&apos;expiration de l&apos;abonnement, l&apos;accès aux
              fonctionnalités réservées est suspendu. Les données restent
              conservées pendant trois mois afin de permettre un renouvellement.
              Sans renouvellement dans ce délai, le compte et les données qui
              lui sont associées sont supprimés définitivement.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>5. Paiement et remboursement</h2>
            <p className={BODY_CLASS}>
              Les paiements en ligne sont traités par le prestataire affiché
              lors de la souscription. Aucun remboursement n&apos;est accordé
              après l&apos;activation de l&apos;abonnement.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>6. Avis et utilisation du service</h2>
            <p className={BODY_CLASS}>
              Le client reste responsable des avis qu&apos;il collecte et de
              leur traitement. Il ne doit pas utiliser AvisTrack pour publier
              des contenus illicites, trompeurs, discriminatoires ou portant
              atteinte aux droits d&apos;autrui. AvisTrack fournit un outil de
              collecte et de consultation ; il ne garantit pas l&apos;exactitude
              des avis rédigés par les visiteurs.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>7. Disponibilité et évolution</h2>
            <p className={BODY_CLASS}>
              ALODO TECH SARL met en œuvre des moyens raisonnables pour assurer
              la disponibilité et la sécurité du service. Des interruptions
              peuvent survenir pour maintenance, incident ou évolution
              technique. Les présentes conditions peuvent être mises à jour ;
              la date de révision est indiquée en haut de page.
            </p>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={HEADING_CLASS}>8. Données personnelles et contact</h2>
            <p className={BODY_CLASS}>
              Le traitement des données est décrit dans la{" "}
              <a
                href="/confidentialite"
                className="font-semibold text-black underline underline-offset-2"
              >
                politique de confidentialité
              </a>
              . Pour toute question relative au service ou à ces conditions,
              contactez ALODO TECH SARL au +229 01 62 71 33 26 ou à{" "}
              <a
                href="mailto:contact@avistrack.org"
                className="font-semibold text-black underline underline-offset-2"
              >
                contact@avistrack.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
