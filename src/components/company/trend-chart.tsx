import { EmptyState, Panel } from "@/components/ui/panel";
import { formatCount } from "@/lib/format";
import type { TrendPoint } from "@/lib/review-trend";

const WIDTH = 720;
const HEIGHT = 240;
const PAD_X = 12;
const PAD_TOP = 28;
const PAD_BOTTOM = 36;

function dayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

/**
 * DE-11 : tendance des avis reçus. Courbe unique, donc une seule couleur
 * d'accent ; chaque valeur reste lisible via l'axe et le résumé textuel.
 * Aucune bibliothèque : le SVG est produit par le serveur, sans script client.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...points.map((point) => point.count));

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (index: number) => PAD_X + index * stepX;
  const y = (value: number) => PAD_TOP + innerH - (value / max) * innerH;
  const baseline = PAD_TOP + innerH;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.count).toFixed(1)}`)
    .join(" ");
  const area = points.length
    ? `${line} L${x(points.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`
    : "";

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const lastIndex = points.length - 1;
  const last = points[lastIndex];

  return (
    <Panel
      id="tendance"
      title="Activité des 30 derniers jours"
      description={
        total === 0
          ? "Aucun avis reçu sur la période."
          : `${formatCount(total)} avis reçus sur la période, jusqu'à ${formatCount(max)} par jour.`
      }
      flush={total === 0}
    >
      {total === 0 ? (
        <EmptyState>
          La courbe s&apos;animera dès les premiers avis reçus.
        </EmptyState>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full sm:h-64"
          role="img"
          aria-label={`Avis reçus par jour sur 30 jours : ${formatCount(total)} avis au total, maximum ${formatCount(max)} sur une journée.`}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {gridLevels.map((level) => (
            <line
              key={level}
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={PAD_TOP + innerH * level}
              y2={PAD_TOP + innerH * level}
              className="stroke-black/10"
              strokeWidth={1}
            />
          ))}

          <text
            x={PAD_X}
            y={PAD_TOP - 12}
            className="fill-gray-600 text-[13px] max-sm:text-[22px]"
          >
            max. {formatCount(max)}/jour
          </text>

          <path d={area} fill="url(#trend-fill)" />
          <path
            d={line}
            className="stroke-accent"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {last ? (
            <circle
              cx={x(lastIndex)}
              cy={y(last.count)}
              r={9}
              className="fill-accent/20"
            />
          ) : null}

          {points.map((point, index) =>
            point.count === 0 ? null : (
              <circle
                key={point.date}
                cx={x(index)}
                cy={y(point.count)}
                r={index === lastIndex ? 4 : 2.5}
                className="fill-accent"
              />
            ),
          )}

          {points.map((point, index) =>
            index % 5 === 0 || index === points.length - 1 ? (
              <text
                key={point.date}
                x={x(index)}
                y={HEIGHT - 10}
                textAnchor={index === 0 ? "start" : index === lastIndex ? "end" : "middle"}
                className={`fill-gray-600 text-[13px] max-sm:text-[20px] ${
                  index !== 0 && index !== lastIndex && index % 10 !== 0
                    ? "max-sm:hidden"
                    : ""
                }`}
              >
                {dayLabel(point.date)}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </Panel>
  );
}
