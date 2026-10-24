import { StarIcon } from "@/components/ui/icons";
import { EmptyState, Panel } from "@/components/ui/panel";
import { formatCount, formatPercent } from "@/lib/format";
import { RATINGS, type ReviewStats } from "@/lib/review-stats";

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 70;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * DE-12 : la satisfaction en un seul bloc. L'anneau donne la part d'avis
 * satisfaits (4 et 5 étoiles) ; la répartition détaille chaque note. La valeur
 * ne dépend jamais de la couleur : le pourcentage et les effectifs sont écrits.
 */
export function SatisfactionOverview({ stats }: { stats: ReviewStats }) {
  const satisfied = stats.distribution[4] + stats.distribution[5];
  const share = stats.total === 0 ? 0 : satisfied / stats.total;
  const percent = formatPercent(share);
  const arc = CIRCUMFERENCE * share;
  const max = Math.max(...RATINGS.map((rating) => stats.distribution[rating]));

  return (
    <Panel
      id="satisfaction"
      title="Satisfaction des clients"
      description={
        stats.total === 0
          ? "La satisfaction apparaîtra dès votre premier avis."
          : "Part des avis de 4 et 5 étoiles, et répartition de toutes les notes."
      }
      flush={stats.total === 0}
    >
      {stats.total === 0 ? (
        <EmptyState>
          Le premier avis reçu remplira cet aperçu en quelques secondes.
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="h-44 w-44 shrink-0"
              role="img"
              aria-label={`${percent} des avis sont satisfaits, soit ${formatCount(satisfied)} avis sur ${formatCount(stats.total)}.`}
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                className="stroke-gray-100"
                strokeWidth={STROKE}
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                className="stroke-accent"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
              <text
                x={CENTER}
                y={CENTER - 2}
                textAnchor="middle"
                className="fill-black"
                fontSize={36}
                fontWeight={700}
              >
                {percent}
              </text>
              <text
                x={CENTER}
                y={CENTER + 22}
                textAnchor="middle"
                className="fill-gray-600"
                fontSize={13}
              >
                satisfaits
              </text>
            </svg>
            <p className="text-center text-sm text-gray-600">
              <span className="font-semibold text-black">
                {formatCount(satisfied)}
              </span>{" "}
              avis de 4 et 5 étoiles
            </p>
          </div>

          <ul className="flex flex-1 flex-col justify-around gap-4">
            {[...RATINGS].reverse().map((rating) => {
              const count = stats.distribution[rating];
              const tone =
                rating >= 4
                  ? "fill-accent"
                  : rating === 3
                    ? "fill-gray-600"
                    : "fill-gray-600/40";
              return (
                <li
                  key={rating}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm sm:gap-4"
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
                    className="h-3.5 w-full rounded-sm bg-gray-100"
                  >
                    <rect width={(count / max) * 100} height="10" className={tone} />
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
        </div>
      )}
    </Panel>
  );
}
