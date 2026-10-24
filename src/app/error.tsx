"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Filet de sécurité des routes (audit) : une erreur inattendue affiche un
 * message lisible et une issue de secours, au lieu d'une page blanche.
 *
 * Le détail technique n'est pas exposé au visiteur : il est journalisé côté
 * console pour le diagnostic.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Erreur non gérée dans l'interface :", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-gray-100 px-4 py-16 text-center">
      <div className="w-full max-w-lg rounded-2xl border border-black/15 bg-white p-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          La page n&apos;a pas pu être affichée. Vos données n&apos;ont pas été
          modifiées. Vous pouvez réessayer ; si le problème persiste,
          contactez l&apos;équipe AvisTrack.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-gray-600">
            Référence de l&apos;erreur : <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Réessayer
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
