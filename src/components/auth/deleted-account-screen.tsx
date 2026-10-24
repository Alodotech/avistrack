import { Button } from "@/components/ui/button";
import { signOutCompany } from "@/server/auth/sign-out";

/**
 * Écran affiché à un compte dont la fiche entreprise a été supprimée.
 *
 * Le compte reste authentifié mais n'a plus d'espace entreprise : la seule
 * action possible est la déconnexion.
 */
export function DeletedAccountScreen() {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-black/15 border-l-4 border-l-red bg-white p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Votre entreprise a été supprimée
        </h1>
        <p className="text-sm leading-6 text-gray-600">
          La fiche de votre entreprise a été supprimée par l&apos;équipe
          AvisTrack. Vos données sont conservées le temps de la procédure
          administrative, puis définitivement effacées. Pour toute question,
          contactez l&apos;équipe AvisTrack.
        </p>
      </header>
      <form action={signOutCompany} className="flex justify-start">
        <Button type="submit" variant="secondary">
          Se déconnecter
        </Button>
      </form>
    </section>
  );
}
