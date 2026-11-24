import Link from "next/link";
import type { ReactNode } from "react";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { InfoTip } from "@/components/ui/info-tip";
import type { KpiDelta } from "@/lib/kpi-delta";

export function KPICard({
  label,
  value,
  hint,
  info,
  href,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  info?: string;
  icon?: ReactNode;
  href: string;
  /** Variation par rapport à la période précédente. */
  delta?: KpiDelta | null;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-2 rounded border border-black/15 bg-white p-4 transition-colors duration-150 hover:border-black/40 focus-visible:border-black lg:p-5"
    >
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
    </Link>
  );
}
