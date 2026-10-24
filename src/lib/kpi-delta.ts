/**
 * Comparaison entre une période courante et la période qui l'a précédée
 * (T04, indicateurs des deux tableaux de bord).
 *
 * Toutes les fonctions sont pures : elles ne lisent ni la base, ni l'horloge.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Intervalle semi-ouvert `[from, to[` : un événement à la borne haute compte. */
export type PeriodWindow = { from: Date; to: Date };

/**
 * La période de `days` jours qui vient de s'écouler, et la période de même
 * durée qui l'a précédée. Les deux fenêtres sont contiguës et sans recouvrement.
 */
export function consecutiveWindows(
  now: Date,
  days: number,
): { current: PeriodWindow; previous: PeriodWindow } {
  const currentFrom = new Date(now.getTime() - days * DAY_MS);
  return {
    current: { from: currentFrom, to: now },
    previous: { from: new Date(currentFrom.getTime() - days * DAY_MS), to: currentFrom },
  };
}

/** Événement daté et noté : un avis suffit à alimenter la comparaison. */
export type RatedMoment = { rating: number; createdAt: Date };

function within(date: Date, window: PeriodWindow): boolean {
  const time = date.getTime();
  return time >= window.from.getTime() && time < window.to.getTime();
}

/** Nombre d'éléments tombant dans la fenêtre. */
export function countWithin(
  dates: readonly Date[],
  window: PeriodWindow,
): number {
  let total = 0;
  for (const date of dates) {
    if (within(date, window)) total += 1;
  }
  return total;
}

/** Note moyenne sur la fenêtre, arrondie à une décimale ; `null` si vide. */
export function averageWithin(
  events: readonly RatedMoment[],
  window: PeriodWindow,
): number | null {
  let total = 0;
  let sum = 0;
  for (const event of events) {
    if (!within(event.createdAt, window)) continue;
    total += 1;
    sum += event.rating;
  }
  return total === 0 ? null : Math.round((sum / total) * 10) / 10;
}

/** Variation en pourcents, arrondie à l'unité. */
export type KpiDelta = { value: number; label: string };

/**
 * Variation relative entre deux mesures de périodes successives.
 *
 * `null` quand la comparaison n'a pas de sens : la période précédente est vide
 * (base nulle) ou les deux mesures sont nulles. On préfère n'afficher aucun
 * indicateur à afficher un pourcentage inventé.
 */
export function percentDelta(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(change)) return null;
  return Math.round(change);
}

/**
 * Variante à afficher par `StatCard`/`KPICard`, avec le libellé de comparaison
 * porteur du contexte (« comparé aux 30 jours précédents »).
 */
export function deltaChip(
  current: number,
  previous: number,
  label: string,
): KpiDelta | null {
  const value = percentDelta(current, previous);
  return value === null ? null : { value, label };
}
