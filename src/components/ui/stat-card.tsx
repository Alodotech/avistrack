import type { ReactNode } from "react";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { InfoTip } from "@/components/ui/info-tip";
import type { KpiDelta } from "@/lib/kpi-delta";

export function StatCard({
  label,
  value,
  hint,
  info,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Explication affichée à côté du libellé. */
  info?: string;
  icon?: ReactNode;
  /** Variation par rapport à la période précédente. */
  delta?: KpiDelta | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded border border-black/15 bg-white p-4 lg:p-5">
      <div className="flex min-w-0 flex-col gap-1 sm:gap-2">
        <dt className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-tight font-medium text-gray-600">
          {label}
          {info ? <InfoTip text={info} className="mb-px" /> : null}
        </dt>
        <dd className="flex items-baseline gap-2 text-2xl leading-none font-semibold tabular-nums lg:text-3xl">
          {value}
          <DeltaBadge delta={delta} />
        </dd>
        {hint ? <dd className="text-xs text-gray-600">{hint}</dd> : null}
      </div>
    </div>
  );
}

export function StatCardSkeleton({ label }: { label: string }) {
  return <StatCard label={label} value={<span aria-hidden>…</span>} />;
}

/** Grille des indicateurs : 2 cartes par ligne sur téléphone, 4 dès que la largeur le permet. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
      {children}
    </dl>
  );
}
