import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-black/15 bg-white p-5">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-3xl font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className="text-xs text-gray-600">{hint}</dd> : null}
    </div>
  );
}

export function StatCardSkeleton({ label }: { label: string }) {
  return <StatCard label={label} value={<span aria-hidden>…</span>} />;
}
