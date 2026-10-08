import type { CompanyStatus } from "@/server/domain";

const MESSAGES: Record<
  Exclude<CompanyStatus, "ACTIVE">,
  { title: string; body: string }
> = {
  SUSPENDED: {
    title: "Votre compte est suspendu",
    body: "L'accès à vos avis et à votre QR code est désactivé, et votre formulaire public n'accepte plus de nouveaux avis. Vos données sont conservées : elles seront de nouveau accessibles, avec le même QR code, dès la réactivation du compte. Contactez l'équipe AvisTrack pour en savoir plus.",
  },
  PENDING: {
    title: "Confirmez votre adresse e-mail",
    body: "Votre compte sera activé dès que vous aurez cliqué sur le lien de vérification envoyé à votre adresse e-mail. Votre QR code et votre tableau de bord seront alors disponibles.",
  },
};

/** DE-05 : un compte inactif voit un écran explicite, et aucune donnée. */
export function AccountStateScreen({
  status,
}: {
  status: Exclude<CompanyStatus, "ACTIVE">;
}) {
  const { title, body } = MESSAGES[status];
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded border-l-4 border-red bg-gray-100 p-6"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-2xl text-sm leading-6">{body}</p>
    </section>
  );
}
