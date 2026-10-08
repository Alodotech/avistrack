const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const ratingFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormatter = new Intl.NumberFormat("fr-FR");

/** Accepte une `Date` ou une date ISO `AAAA-MM-JJ`. */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date): string {
  return `${dateTimeFormatter.format(value)} UTC`;
}

/** Note moyenne sur 5 avec une décimale ; tiret tant qu'il n'y a aucun avis. */
export function formatAverage(average: number | null): string {
  return average === null ? "—" : ratingFormatter.format(average);
}

export function formatCount(value: number): string {
  return countFormatter.format(value);
}
