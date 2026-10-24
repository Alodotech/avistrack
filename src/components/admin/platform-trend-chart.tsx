import { formatCount } from "@/lib/format";
import type { TrendChartPoint } from "@/lib/review-trend";

const WIDTH = 480;
const HEIGHT = 220;
const PAD_X = 10;
const PAD_TOP = 26;
const PAD_BOTTOM = 30;

type Series = {
  key: string;
  title: string;
  /** Couleur de la courbe : l'accent pour l'activité principale, le noir pour l'autre. */
  color: string;
  points: TrendChartPoint[];
  /** Trait pointillé, pour distinguer les séries sans dépendre de la seule couleur. */
  dashed: boolean;
};

function shortMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const labels = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
  ];
  const index = Number(month) - 1;
  const label = labels[index] ?? month;
  return label === "janv." || label === "sept." ? `${label} ${year.slice(2)}` : label;
}

function SeriesChart({ series }: { series: Series }) {
  const total = series.points.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...series.points.map((point) => point.count));

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = series.points.length > 1 ? innerW / (series.points.length - 1) : 0;
  const x = (index: number) => PAD_X + index * stepX;
  const y = (value: number) => PAD_TOP + innerH - (value / max) * innerH;
  const baseline = PAD_TOP + innerH;

  const line = series.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.count).toFixed(1)}`,
    )
    .join(" ");
  const area = series.points.length
    ? `${line} L${x(series.points.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`
    : "";

  const lastIndex = series.points.length - 1;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-block h-1 w-6 rounded-full"
            style={{ backgroundColor: series.color }}
          />
          {series.title}
        </span>
        <span className="text-xs text-gray-600 tabular-nums">
          {formatCount(total)} sur 12 mois
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${series.title} : ${formatCount(total)} sur les douze derniers mois, maximum ${formatCount(max)} sur un mois.`}
      >
        {[0, 0.5, 1].map((level) => (
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

        <text x={PAD_X} y={PAD_TOP - 10} className="fill-gray-600 text-[12px]">
          max. {formatCount(max)}
        </text>

        <path d={area} fill={series.color} fillOpacity={0.08} />
        <path
          d={line}
          stroke={series.color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={series.dashed ? "6 4" : undefined}
          fill="none"
        />

        {series.points.map((point, index) =>
          point.count === 0 ? null : (
            <circle
              key={point.month}
              cx={x(index)}
              cy={y(point.count)}
              r={index === lastIndex ? 3.5 : 2}
              fill={series.color}
            />
          ),
        )}

        {series.points.map((point, index) =>
          index % 3 === 0 || index === lastIndex ? (
            <text
              key={point.month}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? "start" : index === lastIndex ? "end" : "middle"}
              className="fill-gray-600 text-[12px]"
            >
              {shortMonthLabel(point.month)}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/**
 * AD-05 : évolution sur douze mois des inscriptions et des avis. Les deux
 * séries n'ont pas la même unité : chacune a donc sa propre échelle, sinon la
 * plus petite resterait collée au sol. Le SVG est produit par le serveur, sans
 * script client, et chaque valeur reste lisible via l'axe et le résumé.
 */
export function PlatformTrendChart({
  companies,
  reviews,
}: {
  companies: TrendChartPoint[];
  reviews: TrendChartPoint[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <SeriesChart
        series={{
          key: "inscriptions",
          title: "Inscriptions d'entreprises",
          color: "var(--color-accent)",
          points: companies,
          dashed: false,
        }}
      />
      <SeriesChart
        series={{
          key: "avis",
          title: "Avis publiés",
          color: "var(--color-black)",
          points: reviews,
          dashed: true,
        }}
      />
    </div>
  );
}
