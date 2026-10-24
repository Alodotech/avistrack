import type { ReactNode } from "react";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { InfoTip } from "@/components/ui/info-tip";
import type { KpiDelta } from "@/lib/kpi-delta";

export function StatCard({
  label,
  value,
  hint,
  info,
  icon,
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
    <div className="flex items-start justify-between gap-3 rounded-lg border border-black/15 bg-white p-3.5 transition-colors hover:border-black/30 sm:gap-4 sm:p-5 lg:p-6">
      <div className="flex min-w-0 flex-col gap-1 sm:gap-2">
        <dt className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-tight font-semibold tracking-wide text-gray-600 uppercase">
          {label}
          {info ? <InfoTip text={info} className="mb-px" /> : null}
        </dt>
        <dd className="flex items-baseline gap-2 text-2xl leading-none font-semibold tracking-tight tabular-nums min-[420px]:text-3xl lg:text-4xl">
          {value}
          <DeltaBadge delta={delta} />
        </dd>
        {hint ? <dd className="text-xs text-gray-600">{hint}</dd> : null}
      </div>
      {icon ? (
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent sm:flex">
          {icon}
        </span>
      ) : null}
    </div>
  );
}

export function StatCardSkeleton({ label }: { label: string }) {
  return <StatCard label={label} value={<span aria-hidden>…</span>} />;
}

/** Grille des indicateurs : 2 cartes par ligne sur téléphone, 4 dès que la largeur le permet. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-3 min-[760px]:grid-cols-4 min-[760px]:gap-4 xl:gap-6">
      {children}
    </dl>
  );
}
