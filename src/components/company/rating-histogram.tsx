import { formatCount } from "@/lib/format";
import { RATINGS, type ReviewStats } from "@/lib/review-stats";

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

/**
 * DE-06 : répartition des notes. Une seule série, donc une seule couleur ;
 * chaque barre porte son effectif et sa part en clair, sans dépendre de la
 * couleur ni d'un survol. Les largeurs passent par des attributs SVG (pas de
 * style en ligne) pour rester compatibles avec une CSP stricte.
 */
export function RatingHistogram({ stats }: { stats: ReviewStats }) {
  const max = Math.max(...RATINGS.map((rating) => stats.distribution[rating]));

  return (
    <section
      aria-labelledby="histogram-title"
      className="flex flex-col gap-4 rounded border border-black/15 p-5"
    >
      <h2 id="histogram-title" className="text-lg font-semibold">
        Répartition des notes
      </h2>
      <ul className="flex flex-col gap-2">
        {[...RATINGS].reverse().map((rating) => {
          const count = stats.distribution[rating];
          const share = stats.total === 0 ? 0 : count / stats.total;
          return (
            <li
              key={rating}
              className="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-3 text-sm"
            >
              <span className="font-semibold">
                {rating} <span aria-hidden>★</span>
                <span className="sr-only">
                  {rating > 1 ? "étoiles" : "étoile"}
                </span>
              </span>
              <svg
                aria-hidden
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                className="h-3 w-full fill-black"
              >
                <rect
                  width={max === 0 ? 0 : (count / max) * 100}
                  height="10"
                />
              </svg>
              <span className="text-right tabular-nums text-gray-600">
                {formatCount(count)} · {percentFormatter.format(share)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
