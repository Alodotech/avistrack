import Link from "next/link";

/** Page 404 : le lien n'existe pas ou la ressource a été supprimée. */
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-gray-100 px-4 py-16 text-center">
      <div className="w-full max-w-lg rounded-2xl border border-black/15 bg-white p-8">
        <p className="text-sm font-semibold text-accent">Erreur 404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Le lien est peut-être obsolète, ou le formulaire d&apos;avis a été
          retiré. Vérifiez l&apos;adresse, ou revenez à l&apos;accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/?auth=login"
            className="inline-flex min-h-11 items-center rounded-full border border-black/30 px-5 text-sm font-semibold transition-colors hover:bg-gray-100"
          >
            Espace entreprise
          </Link>
        </div>
      </div>
    </div>
  );
}
