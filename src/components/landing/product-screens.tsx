import type { ReactNode } from "react";
import {
  MessageIcon,
  StarIcon,
  ThumbUpIcon,
  TrendIcon,
} from "@/components/ui/icons";

/**
 * Maquettes HTML des écrans produit montrées dans les chapitres de la landing.
 *
 * Volontairement en DOM (et non en textures WebGL) : elles restent nettes,
 * lisibles, accessibles et visibles même quand la scène 3D n'est pas rendue.
 * Les données reprennent celles du dashboard réel (RG-06 : moyenne sur 128
 * avis, répartition 1→5, dernière revue par commerce).
 */

/** Répartition cohérente : 128 avis, moyenne 4,6 / 5, 97 % à 4-5 étoiles. */
const DISTRIBUTION: { rating: number; count: number }[] = [
  { rating: 5, count: 82 },
  { rating: 4, count: 42 },
  { rating: 3, count: 2 },
  { rating: 2, count: 1 },
  { rating: 1, count: 1 },
];
const TOTAL = 128;
const MAX = 82;

const STATS = [
  { label: "Note moyenne", value: "4,6", suffix: " / 5", icon: <StarIcon filled={false} className="size-4" /> },
  { label: "Avis reçus", value: String(TOTAL), icon: <MessageIcon className="size-4" /> },
  { label: "Avis sur 30 jours", value: "42", icon: <TrendIcon className="size-4" /> },
  { label: "Clients satisfaits", value: "97 %", icon: <ThumbUpIcon className="size-4" /> },
] as const;

const RECENT_REVIEWS = [
  { rating: 5, date: "08/10/2026", comment: "Accueil très professionnel, je recommande." },
  { rating: 5, date: "06/10/2026", comment: "Conseils clairs et précis, merci." },
  { rating: 4, date: "05/10/2026", comment: "Rapide et efficace." },
  { rating: 2, date: "03/10/2026", comment: "Beaucoup d'attente en caisse." },
] as const;

/** Étoiles décoratives : la valeur chiffrée voisine porte le sens. */
function Stars({ rating, accent = false }: { rating: number; accent?: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((step) => {
        const filled = step <= rating;
        return (
          <StarIcon
            key={step}
            filled={filled}
            className={`size-3.5 ${filled && accent ? "text-accent" : ""}`}
          />
        );
      })}
      <span className="sr-only">{rating} sur 5</span>
    </span>
  );
}

/** Cadre commun : l'écran, puis sa légende. */
function ScreenShell({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      {children}
      <p className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.18em] text-gray-600 uppercase">
        <span className="ink-dot" aria-hidden />
        {caption}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 01 — Plaque QR imprimée                                                     */
/* -------------------------------------------------------------------------- */

export function QrStandScreen() {
  return (
    <ScreenShell caption="Aperçu · Votre QR code, à imprimer">
      <article className="w-full max-w-[22rem] rounded-2xl border border-black/15 bg-white p-7 text-center shadow-2xl shadow-black/25">
        <div className="flex items-center justify-center gap-2">
          <span className="logo-mark" aria-hidden />
          <span className="text-sm font-semibold tracking-[0.22em]">
            AVISTRACK
          </span>
        </div>

        <h3 className="mt-6 text-2xl font-semibold tracking-tight">
          Votre avis compte.
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Scannez le QR code et notez votre visite en 30 secondes.
        </p>

        <div className="mt-5 rounded-xl border border-black/10 bg-gray-100 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/landing/qr-code-avistrack.png"
            alt="QR code menant au formulaire d'avis"
            width={208}
            height={208}
            decoding="async"
            className="mx-auto aspect-square w-full max-w-[12rem] rounded-md bg-white object-contain"
          />
        </div>

        <p className="mt-5 text-sm font-semibold">Pharmacie du Centre</p>
        <p className="mt-1 text-xs text-gray-600">
          Sans compte · sans application
        </p>
      </article>
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 02 — Formulaire sur le téléphone du client                                  */
/* -------------------------------------------------------------------------- */

export function PhoneFormScreen() {
  return (
    <ScreenShell caption="Aperçu · Le formulaire, sans compte">
      <div className="w-full max-w-[17.5rem] rounded-[2.75rem] border border-black/20 bg-black p-2.5 shadow-2xl shadow-black/30">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-white">
          {/* Encoche + barre d'accueil */}
          <div
            className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black"
            aria-hidden
          />
          <div
            className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-black/25"
            aria-hidden
          />

          <div className="flex flex-col gap-5 px-5 pb-8 pt-11">
            {/* Barre de statut */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="tabular-nums">9:41</span>
              <span className="flex items-center gap-1" aria-hidden>
                <span className="flex items-end gap-0.5">
                  <i className="block h-1.5 w-0.5 rounded-sm bg-black" />
                  <i className="block h-2.5 w-0.5 rounded-sm bg-black" />
                  <i className="block h-3.5 w-0.5 rounded-sm bg-black" />
                </span>
                <span className="ml-1 block h-2.5 w-5 rounded-[3px] border border-black/60 p-px">
                  <span className="block h-full w-3/4 rounded-[1px] bg-black" />
                </span>
              </span>
            </div>

            {/* En-tête commerce */}
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
                P
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Pharmacie du Centre
                </p>
                <p className="text-xs text-gray-600">Notez votre visite</p>
              </div>
            </div>

            {/* Titre + étoiles */}
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Comment s&apos;est passée votre visite ?
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <Stars rating={4} accent />
                <span className="text-sm font-semibold">Très bien</span>
              </div>
            </div>

            {/* Date de visite */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Date de visite
              </span>
              <span className="flex min-h-11 items-center rounded-lg bg-gray-100 px-3 text-sm font-medium">
                Aujourd&apos;hui
              </span>
            </label>

            {/* Commentaire */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Votre commentaire
              </span>
              <span className="min-h-24 rounded-lg bg-gray-100 px-3 py-3 text-sm leading-6 text-gray-600">
                Dites-nous en plus (facultatif)
              </span>
            </label>

            {/* Envoi */}
            <span className="grid min-h-12 place-items-center rounded-full bg-accent text-sm font-semibold text-white shadow-lg shadow-accent/30">
              Envoyer mon avis
            </span>
            <p className="text-center text-[0.7rem] text-gray-600">
              Confidentiel · sans compte, sans application
            </p>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 — Tableau de bord                                                        */
/* -------------------------------------------------------------------------- */

export function DashboardScreen() {
  return (
    <ScreenShell caption="Aperçu · Votre tableau de bord">
      <div className="w-full rounded-xl border border-black/15 bg-white shadow-2xl shadow-black/25">
        {/* Chrome de fenêtre */}
        <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <i className="block size-2.5 rounded-full bg-black/15" />
            <i className="block size-2.5 rounded-full bg-black/15" />
            <i className="block size-2.5 rounded-full bg-black/15" />
          </span>
          <span className="mx-auto rounded-md bg-gray-100 px-3 py-1 text-[0.65rem] text-gray-600">
            avistrack.fr/dashboard
          </span>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <header>
            <h3 className="text-lg font-semibold tracking-tight">
              Tableau de bord
            </h3>
            <p className="text-xs text-gray-600">
              Votre QR code, la satisfaction de vos clients et leurs avis.
            </p>
          </header>

          {/* Indicateurs */}
          <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-black/10 bg-white p-3"
              >
                <dt className="text-[0.6rem] font-semibold tracking-wide text-gray-600 uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-1 flex items-baseline gap-1 text-xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                  {"suffix" in stat ? (
                    <span className="text-xs font-normal text-gray-600">
                      {stat.suffix}
                    </span>
                  ) : null}
                </dd>
                <span className="mt-1 flex text-gray-600">
                  {stat.icon}
                </span>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Répartition des notes */}
            <section className="rounded-lg border border-black/10 p-3.5">
              <h4 className="text-sm font-semibold">Répartition des notes</h4>
              <p className="mt-0.5 text-[0.7rem] text-gray-600">
                4,6 / 5 · {TOTAL} avis
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {DISTRIBUTION.map(({ rating, count }) => (
                  <li
                    key={rating}
                    className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2 text-xs"
                  >
                    <span className="flex items-center gap-1 font-semibold tabular-nums">
                      {rating}
                      <StarIcon filled className="size-3 text-accent" />
                    </span>
                    <svg
                      aria-hidden
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                      className="h-2.5 w-full rounded-sm bg-gray-100 fill-accent"
                    >
                      <rect width={(count / MAX) * 100} height="10" />
                    </svg>
                    <span className="text-right tabular-nums text-gray-600">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Derniers avis */}
            <section className="rounded-lg border border-black/10 p-3.5">
              <h4 className="text-sm font-semibold">Derniers avis</h4>
              <p className="mt-0.5 text-[0.7rem] text-gray-600">
                Du plus récent au plus ancien
              </p>
              <ul className="mt-2 flex flex-col divide-y divide-black/10">
                {RECENT_REVIEWS.map((review) => (
                  <li
                    key={review.comment}
                    className="flex flex-col gap-1 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Stars rating={review.rating} />
                      <span className="text-[0.65rem] tabular-nums text-gray-600">
                        {review.date}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs leading-5">
                      {review.comment}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
