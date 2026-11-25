/** Un point de la série : un mois (étiquette) et le nombre d'avis reçus. */
export type TrendChartPoint = {
  month: string;
  count: number;
};

/** Un point de la série : un jour (ISO `AAAA-MM-JJ`) et le nombre d'avis reçus. */
export type TrendPoint = {
  date: string;
  count: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mois courant, au format `AAAA-MM`. */
export type MonthKey = string;

const MONTH_LABELS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Clés des `months` derniers mois, de la plus ancienne à la plus récente.
 * Une série sans trou : les mois sans activité valent zéro.
 */
export function lastMonthKeys(now: Date, months = 12): MonthKey[] {
  const keys: MonthKey[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    keys.push(monthKey(date));
  }
  return keys;
}

/** Clé `AAAA-MM` d'une date. */
export function monthKey(date: Date): MonthKey {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Libellé lisible d'une clé `AAAA-MM` (« octobre 2026 »). */
export function monthLabel(key: MonthKey): string {
  const [year, month] = key.split("-");
  const index = Number(month) - 1;
  const label = MONTH_LABELS[index] ?? month;
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
}

/**
 * Compte les éléments par mois de création sur les `months` derniers mois.
 * Les dates hors fenêtre sont ignorées ; chaque mois de la fenêtre vaut zéro
 * au minimum, pour que la courbe reste continue.
 */
export function countByMonth(
  dates: readonly Date[],
  now: Date,
  months = 12,
): TrendChartPoint[] {
  const keys = lastMonthKeys(now, months);
  const counts = new Map<MonthKey, number>(keys.map((key) => [key, 0]));

  for (const date of dates) {
    const key = monthKey(date);
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((key) => ({ month: key, count: counts.get(key) ?? 0 }));
}

/** Série journalière des avis sur les `days` derniers jours, du plus ancien au
 *plus récent. Les jours sans avis valent zéro : la courbe reste continue.
 */
export function buildDailyTrend(
  reviews: readonly { createdAt: Date }[],
  days: number,
  now: Date,
): TrendPoint[] {
  const start = new Date(now.getTime() - (days - 1) * DAY_MS);
  start.setUTCHours(0, 0, 0, 0);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const key = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const review of reviews) {
    const key = review.createdAt.toISOString().slice(0, 10);
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}
