"use client";

import { useState } from "react";
import {
  ChartTooltip,
  ResponsiveChart,
} from "@/components/ui/responsive-chart";
import { formatCount, formatShortDate } from "@/lib/format";
import type { PlatformActivity } from "@/server/repositories/platform-activity-repository";

const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const PAD_X = 34;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;

const SERIES = [
  {
    key: "registrations" as const,
    label: "Entreprises inscrites",
    color: "var(--color-accent)",
  },
  {
    key: "subscriptions" as const,
    label: "Avec abonnement",
    color: "var(--color-black)",
  },
];

/** Activité de la plateforme : deux séries, rouge et noir, une seule échelle. */
export function PlatformActivityChart({
  activity,
}: {
  activity: PlatformActivity;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const points = activity.points;
  const max = Math.max(
    1,
    ...points.flatMap((point) => SERIES.map((series) => point[series.key])),
  );
  const lastIndex = points.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        <Summary label="Entreprises" value={activity.totalCompanies} />
        <Summary
          label="Inscriptions sur la période"
          value={activity.registrations}
        />
        <Summary
          label="Avec abonnement"
          value={activity.registrationsWithSubscription}
        />
        <Summary label="Avis reçus" value={activity.reviews} />
      </dl>

      <figure className="flex flex-col gap-3">
        <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-0.5 w-5"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </span>
          ))}
        </figcaption>

        <ResponsiveChart className="chart-plot">
          {({ width, height }) => {
            const innerW = Math.max(1, width - PAD_X * 2);
            const innerH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);
            const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
            const x = (index: number) => PAD_X + index * stepX;
            const y = (value: number) => PAD_TOP + innerH - (value / max) * innerH;
            const tickEvery = Math.max(
              1,
              Math.ceil(points.length / (width < 480 ? 4 : 6)),
            );

            return (
              <>
                <svg
                  width="100%"
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  role="img"
                  aria-label={`Activité des ${activity.days} derniers jours : ${activity.registrations} inscriptions dont ${activity.registrationsWithSubscription} avec abonnement.`}
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

                  {SERIES.map((series) => {
                    const line = points
                      .map(
                        (point, index) =>
                          `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[series.key]).toFixed(1)}`,
                      )
                      .join(" ");
                    return (
                      <path
                        key={series.key}
                        d={line}
                        stroke={series.color}
                        strokeWidth={1.75}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  })}

                  {hover !== null && points[hover] ? (
                    <>
                      {SERIES.map((series) => (
                        <circle
                          key={series.key}
                          cx={x(hover)}
                          cy={y(points[hover][series.key])}
                          r={4}
                          className="fill-white"
                          stroke={series.color}
                          strokeWidth={2}
                        />
                      ))}
                    </>
                  ) : null}

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
                      {
                        label: formatShortDate(points[hover].date),
                        value: "",
                      },
                      ...SERIES.map((series) => ({
                        label: series.label,
                        value: formatCount(points[hover][series.key]),
                        emphasis: true,
                      })),
                    ]}
                  />
                ) : null}
              </>
            );
          }}
        </ResponsiveChart>
      </figure>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatCount(value)}</dd>
    </div>
  );
}
