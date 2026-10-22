import type { KpiDelta } from "@/lib/kpi-delta";

/**
 * Pastille de variation partagée par `StatCard` et `KPICard`.
 *
 * Le libellé est exposé à la fois dans l'infobulle et au lecteur d'écran :
 * un pourcentage seul ne dit pas ce qui est comparé.
 */
export function DeltaBadge({ delta }: { delta?: KpiDelta | null }) {
  if (!delta) return null;
  /*
   * Charte §13.2 : la palette est restreinte à blanc, noir et rouge. Une
   * hausse s'exprime donc par l'encre (noir), une baisse par le rouge.
   */
  const tone =
    delta.value > 0
      ? "text-black"
      : delta.value < 0
        ? "text-red"
        : "text-gray-600";

  return (
    <span
      className={`text-xs font-semibold tabular-nums ${tone}`}
      title={delta.label}
    >
      {delta.value > 0 ? "+" : ""}
      {delta.value.toFixed(0)}%
      <span className="sr-only"> {delta.label}</span>
    </span>
  );
}
