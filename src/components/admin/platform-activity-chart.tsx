import { formatCount } from "@/lib/format";
import type { PlatformActivity } from "@/server/repositories/platform-activity-repository";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_X = 12;
const PAD_TOP = 22;
const PAD_BOTTOM = 34;

const SERIES = [
  {
    key: "registrations" as const,
    label: "Entreprises inscrites",
    color: "#0F5C47",
  },
  {
    key: "subscriptions" as const,
    label: "Inscriptions avec abonnement",
    color: "#C2410C",
  },
];

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Courbes d'activité sur une fenêtre glissante, produites côté serveur. */
export function PlatformActivityChart({
  activity,
}: {
  activity: PlatformActivity;
}) {
  const points = activity.points;
  const max = Math.max(
    1,
    ...points.flatMap((point) => SERIES.map((series) => point[series.key])),
  );
  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (index: number) => PAD_X + index * stepX;
  const y = (value: number) => PAD_TOP + innerH - (value / max) * innerH;
  const labelEvery = points.length <= 14 ? 1 : Math.ceil(points.length / 8);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary
          label="Entreprises utilisatrices"
          value={activity.totalCompanies}
        />
        <Summary
          label="Inscriptions sur la période"
          value={activity.registrations}
          color="#0F5C47"
        />
        <Summary
          label="Inscriptions avec abonnement"
          value={activity.registrationsWithSubscription}
          color="#C2410C"
        />
      </div>

      <figure className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-gray-700">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-1 w-6 rounded-full"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </span>
          ))}
          <span className="ml-auto text-gray-500">
            {formatCount(activity.reviews)} avis sur la période
          </span>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Activité des ${activity.days} derniers jours : ${activity.registrations} inscriptions dont ${activity.registrationsWithSubscription} avec abonnement, sur ${activity.totalCompanies} entreprises.`}
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

          <text x={PAD_X} y={PAD_TOP - 8} className="fill-gray-500 text-[11px]">
            max. {formatCount(max)}
          </text>

          {SERIES.map((series) => {
            const line = points
              .map((point, index) => {
                const value = point[series.key];
                return `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
              })
              .join(" ");
            return (
              <path
                key={series.key}
                d={line}
                stroke={series.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            );
          })}

          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text
                key={point.date}
                x={x(index)}
                y={HEIGHT - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-gray-500 text-[11px]"
              >
                {shortDate(point.date)}
              </text>
            ) : null,
          )}
        </svg>
      </figure>
    </div>
  );
}

function Summary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  /** Absent pour le chiffre clé global : il ne fait partie d'aucune série. */
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-gray-50/70 p-3.5">
      <span className="flex items-center gap-2 text-[0.68rem] font-bold tracking-wider text-gray-500 uppercase">
        {color ? (
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </span>
      <p className="mt-1 text-2xl font-bold tracking-tight text-black tabular-nums">
        {formatCount(value)}
      </p>
    </div>
  );
}
