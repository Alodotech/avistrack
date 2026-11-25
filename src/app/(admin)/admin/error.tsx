"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/server/auth/sign-out";

/**
 * Filet de sécurité de l'espace d'administration : l'erreur reste dans
 * l'espace connecté, et la déconnexion reste possible.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Erreur dans l'espace d'administration :", error);
  }, [error]);

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-black/15 border-l-4 border-l-red bg-white p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Impossible d&apos;afficher cette page
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Aucune donnée n&apos;a été modifiée. Réessayez, ou revenez au tableau
          de bord d&apos;administration.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-gray-600">
            Référence de l&apos;erreur : <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin")}
        >
          Tableau de bord
        </Button>
        <form action={signOutAdmin}>
          <Button type="submit" variant="ghost">
            Se déconnecter
          </Button>
        </form>
      </div>
    </section>
  );
}
