"use client";

import { useState } from "react";
import { EmptyState, Panel } from "@/components/ui/panel";
import {
  ChartTooltip,
  ResponsiveChart,
} from "@/components/ui/responsive-chart";
import { formatCount, formatShortDate } from "@/lib/format";
import type { TrendPoint } from "@/lib/review-trend";

const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const PAD_X = 34;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

/** Tendance des avis reçus : une courbe, une couleur, grille discrète. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...points.map((point) => point.count));
  const lastIndex = points.length - 1;

  return (
    <Panel
      id="tendance"
      title="Avis reçus"
      description={
        total === 0
          ? "Aucun avis sur cette période."
          : `${formatCount(total)} avis sur la période, au plus ${formatCount(max)} par jour.`
      }
      flush={total === 0}
    >
      {total === 0 ? (
        <EmptyState>Aucun avis sur cette période.</EmptyState>
      ) : (
        <ResponsiveChart className="chart-plot">
          {({ width, height }) => {
            const innerW = Math.max(1, width - PAD_X * 2);
            const innerH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
            const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
            const x = (index: number) => PAD_X + index * stepX;
            const y = (value: number) => PAD_TOP + innerH - (value / max) * innerH;
            const baseline = PAD_TOP + innerH;
            const line = points
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.count).toFixed(1)}`,
              )
              .join(" ");
            const area = `${line} L${x(lastIndex).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`;
            const tickEvery = width < 480 ? 7 : 5;

            return (
              <>
                <svg
                  width="100%"
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  role="img"
                  aria-label={`Avis reçus par jour : ${formatCount(total)} avis au total, au plus ${formatCount(max)} sur une journée.`}
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
                  <text x={0} y={baseline + 4} className="fill-gray-500 text-[10px]">
                    0
                  </text>

                  <path d={area} className="fill-accent/5" />
                  <path
                    d={line}
                    className="stroke-accent"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {points.map((point, index) =>
                    index % tickEvery === 0 || index === lastIndex ? (
                      <text
                        key={point.date}
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
                        {formatShortDate(point.date)}
                      </text>
                    ) : null,
                  )}

                  {hover !== null && points[hover] ? (
                    <circle
                      cx={x(hover)}
                      cy={y(points[hover].count)}
                      r={4}
                      className="fill-white stroke-accent"
                      strokeWidth={2}
                    />
                  ) : null}

                  {points.map((point, index) => (
                    <rect
                      key={point.date}
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
                {hover !== null && points[hover] ? (
                  <ChartTooltip
                    x={x(hover)}
                    width={width}
                    lines={[
                      { label: formatShortDate(points[hover].date), value: "" },
                      {
                        label: "Avis",
                        value: formatCount(points[hover].count),
                        emphasis: true,
                      },
                    ]}
                  />
                ) : null}
              </>
            );
          }}
        </ResponsiveChart>
      )}
    </Panel>
  );
}
