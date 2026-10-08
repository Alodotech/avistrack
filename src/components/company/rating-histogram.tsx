import { StarIcon } from "@/components/ui/icons";
import { EmptyState, Panel } from "@/components/ui/panel";
import { formatCount, formatPercent } from "@/lib/format";
import { RATINGS, type ReviewStats } from "@/lib/review-stats";

/**
 * DE-06 : répartition des notes. Une seule série, donc une seule couleur ;
 * chaque barre porte son effectif et sa part en clair, sans dépendre de la
 * couleur ni d'un survol. Les largeurs passent par des attributs SVG (pas de
 * style en ligne) pour rester compatibles avec une CSP stricte.
 */
export function RatingHistogram({ stats }: { stats: ReviewStats }) {
  const max = Math.max(...RATINGS.map((rating) => stats.distribution[rating]));

  return (
    <Panel
      id="repartition"
      title="Répartition des notes"
      description="Nombre d'avis et part du total pour chaque note."
      flush={stats.total === 0}
    >
      {stats.total === 0 ? (
        <EmptyState>
          La répartition apparaîtra dès votre premier avis.
        </EmptyState>
      ) : (
        <ul className="flex flex-1 flex-col justify-around gap-4">
          {[...RATINGS].reverse().map((rating) => {
            const count = stats.distribution[rating];
            return (
              <li
                key={rating}
                className="grid grid-cols-[2.5rem_1fr_7rem] items-center gap-4 text-sm"
              >
                <span className="flex items-center gap-1 font-semibold tabular-nums">
                  {rating}
                  <StarIcon filled />
                  <span className="sr-only">
                    {rating > 1 ? "étoiles" : "étoile"}
                  </span>
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  className="h-4 w-full rounded-sm bg-gray-100 fill-black"
                >
                  <rect width={(count / max) * 100} height="10" />
                </svg>
                <span className="text-right tabular-nums">
                  <span className="font-semibold">{formatCount(count)}</span>
                  <span className="text-gray-600">
                    {" "}
                    · {formatPercent(count / stats.total)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
