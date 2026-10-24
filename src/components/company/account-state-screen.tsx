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
      className="grid gap-4 rounded-lg border border-black/15 border-l-4 border-l-red bg-white p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8 lg:p-8"
    >
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm leading-6">{body}</p>
    </section>
  );
}
