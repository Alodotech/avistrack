import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment AvisTrack collecte, utilise et protège les données des avis clients.",
};

/**
 * Politique de confidentialité.
 *
 * Elle décrit le fonctionnement réel de l'application (ce que la base de
 * données contient, qui y accède, ce qui est conservé et pendant combien de
 * temps). Les mentions qui engagent l'éditeur (base légale, DPO) restent
 * signalées comme à faire valider.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16 lg:py-24">
      <div className="rounded-2xl border border-black/15 bg-white p-6 text-black sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Ce document décrit le traitement des données personnelles liées aux
          avis clients. Les bases légales et le nom du responsable de traitement
          sont à faire valider avant la mise en production.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Responsable du traitement</h2>
            <p className="text-gray-600">
              Éditeur du service AvisTrack (raison sociale et adresse à
              renseigner). Contact :{" "}
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
            <h2 className="text-base font-semibold">Données collectées</h2>
            <p className="text-gray-600">
              Lorsqu&apos;un client dépose un avis, le service enregistre la note
              attribuée, le commentaire éventuel, la date de visite et les
              réponses aux questions du formulaire du commerce. Aucun compte
              n&apos;est requis pour déposer un avis et aucune donnée
              d&apos;identification directe du client n&apos;est demandée.
            </p>
            <p className="text-gray-600">
              Côté entreprise, l&apos;inscription recueille la raison sociale, une
              adresse e-mail, un numéro de téléphone, les identifiants de
              connexion du compte et, le cas échéant, un logo facultatif. Chaque
              action d&apos;administration
              (suspension, réactivation, suppression) est horodatée et
              consignée dans un journal d&apos;audit.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Finalité du traitement</h2>
            <p className="text-gray-600">
              Les données servent uniquement à afficher les avis et les
              statistiques au commerce concerné, afin d&apos;améliorer la
              qualité de son accueil. Aucune donnée d&apos;avis n&apos;est
              revendue, ni utilisée à des fins publicitaires.
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
              Les avis sont conservés tant que le compte du commerce est actif.
              À la suppression d&apos;un compte entreprise, les données associées
              sont conservées 30 jours (pour rester reconfigurables en cas
              d&apos;erreur), puis effacées définitivement, automatiquement et
              chaque jour.
            </p>
            <p className="text-gray-600">
              Les sessions de connexion expirent selon les paramètres de
              l&apos;authentification ; les cookies de session sont techniques
              et ne sont pas utilisés à des fins de suivi publicitaire.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Sous-traitants</h2>
            <p className="text-gray-600">
              L&apos;hébergement technique (base de données et authentification)
              est confié à Supabase. La connexion des comptes entreprise peut
              également utiliser Google OAuth : dans ce cas, l&apos;identité
              transmise par Google se limite à l&apos;adresse e-mail du compte.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Vos droits</h2>
            <p className="text-gray-600">
              Vous disposez d&apos;un droit d&apos;accès, de rectification, de
              limitation et de suppression des données qui vous concernent, ainsi
              que du droit à la portabilité. Pour l&apos;exercer, écrivez à{" "}
              <a
                href="mailto:contact@avistrack.com"
                className="py-3.5 font-semibold text-black underline-offset-4 hover:underline"
              >
                contact@avistrack.com
              </a>
              . Vous disposez également du droit d&apos;introduire une réclamation
              auprès de l&apos;autorité de contrôle compétente.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
