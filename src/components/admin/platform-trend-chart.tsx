"use client";

import { useState } from "react";
import {
  ChartTooltip,
  ResponsiveChart,
} from "@/components/ui/responsive-chart";
import { formatCount, formatShortDate } from "@/lib/format";
import type { TrendChartPoint } from "@/lib/review-trend";

const GRID_LEVELS = [0, 0.5, 1];
const PAD_X = 34;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

type Series = {
  key: string;
  title: string;
  color: string;
  points: TrendChartPoint[];
  dashed: boolean;
};

function SeriesChart({ series }: { series: Series }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = series.points.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...series.points.map((point) => point.count));
  const lastIndex = series.points.length - 1;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="inline-block h-0.5 w-5"
            style={{ backgroundColor: series.color }}
          />
          {series.title}
        </span>
        <span className="text-gray-600 tabular-nums">
          {formatCount(total)} sur 12 mois
        </span>
      </figcaption>

      <ResponsiveChart className="chart-plot">
        {({ width, height }) => {
          const innerW = Math.max(1, width - PAD_X * 2);
          const innerH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
          const stepX =
            series.points.length > 1 ? innerW / (series.points.length - 1) : 0;
          const x = (index: number) => PAD_X + index * stepX;
          const y = (value: number) =>
            PAD_TOP + innerH - (value / max) * innerH;
          const line = series.points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.count).toFixed(1)}`,
            )
            .join(" ");
          const tickEvery = Math.max(
            1,
            Math.ceil(series.points.length / (width < 480 ? 4 : 6)),
          );

          return (
            <>
              <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`${series.title} : ${formatCount(total)} sur les douze derniers mois.`}
              >
                {GRID_LEVELS.map((level) => (
                  <line
                    key={level}
                    x1={PAD_X}
                    x2={width - PAD_X}
                    y1={PAD_TOP + innerH * level}
                    y2={PAD_TOP + innerH * level}
                    className="stroke-black/10"
                    strokeWidth={1}
                  />
                ))}
                <text x={0} y={PAD_TOP + 4} className="fill-gray-500 text-[10px]">
                  {formatCount(max)}
                </text>
                <text
                  x={0}
                  y={PAD_TOP + innerH + 4}
                  className="fill-gray-500 text-[10px]"
                >
                  0
                </text>

                <path
                  d={line}
                  stroke={series.color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={series.dashed ? "5 4" : undefined}
                  fill="none"
                />
                {hover !== null && series.points[hover] ? (
                  <circle
                    cx={x(hover)}
                    cy={y(series.points[hover].count)}
                    r={4}
                    className="fill-white"
                    stroke={series.color}
                    strokeWidth={2}
                  />
                ) : null}
                {series.points.map((point, index) =>
                  index % tickEvery === 0 || index === lastIndex ? (
                    <text
                      key={point.month}
                      x={x(index)}
                      y={height - 6}
                      textAnchor={
                        index === 0
                          ? "start"
                          : index === lastIndex
                            ? "end"
                            : "middle"
                      }
                      className="fill-gray-500 text-[10px]"
                    >
                      {formatShortDate(`${point.month}-01`)}
                    </text>
                  ) : null,
                )}
                {series.points.map((point, index) => (
                  <rect
                    key={point.month}
                    x={x(index) - stepX / 2}
                    y={PAD_TOP}
                    width={Math.max(stepX, 2)}
                    height={innerH}
                    fill="transparent"
                    onPointerEnter={() => setHover(index)}
                    onPointerDown={() => setHover(index)}
                    onPointerLeave={() => setHover(null)}
                  />
                ))}
              </svg>
              {hover !== null && series.points[hover] ? (
                <ChartTooltip
                  x={x(hover)}
                  width={width}
                  lines={[
                    {
                      label: formatShortDate(`${series.points[hover].month}-01`),
                      value: "",
                    },
                    {
                      label: "Total",
                      value: formatCount(series.points[hover].count),
                      emphasis: true,
                    },
                  ]}
                />
              ) : null}
            </>
          );
        }}
      </ResponsiveChart>
    </figure>
  );
}

/** Évolution sur douze mois : deux séries, rouge pour l'activité, noir pour le reste. */
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
