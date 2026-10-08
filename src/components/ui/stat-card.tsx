import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-black/15 bg-white p-4 sm:p-5 lg:p-6">
      <div className="flex min-w-0 flex-col gap-2">
        <dt className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
          {label}
        </dt>
        <dd className="text-3xl font-semibold tracking-tight tabular-nums lg:text-4xl">
          {value}
        </dd>
        {hint ? <dd className="text-xs text-gray-600">{hint}</dd> : null}
      </div>
      {icon ? (
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 sm:flex">
          {icon}
        </span>
      ) : null}
    </div>
  );
}

export function StatCardSkeleton({ label }: { label: string }) {
  return <StatCard label={label} value={<span aria-hidden>…</span>} />;
}

/** Grille des indicateurs : 2 colonnes jusqu'à 1280 px, 4 au-delà. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-4 lg:gap-6 xl:grid-cols-4">
      {children}
    </dl>
  );
}
