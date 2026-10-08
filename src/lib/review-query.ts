import { z } from "zod";
import type { Rating } from "@/server/domain";
import { parsePage } from "./pagination";

export const REVIEWS_PAGE_SIZE = 10;

export const PERIOD_OPTIONS = [
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "90 derniers jours" },
] as const;

export type PeriodDays = (typeof PERIOD_OPTIONS)[number]["days"];

export type ReviewQuery = {
  page: number;
  rating?: Rating;
  periodDays?: PeriodDays;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

// Un filtre invalide est ignoré plutôt que de faire échouer la page.
const ratingSchema = z
  .preprocess(first, z.enum(["1", "2", "3", "4", "5"]))
  .transform((value) => Number(value) as Rating)
  .optional()
  .catch(undefined);

const periodSchema = z
  .preprocess(first, z.enum(["7", "30", "90"]))
  .transform((value) => Number(value) as PeriodDays)
  .optional()
  .catch(undefined);

/** Filtres de la liste d'avis lus depuis l'URL (DE-07). Ne contient jamais d'identité. */
export function parseReviewQuery(params: RawParams): ReviewQuery {
  return {
    page: parsePage(params.page),
    rating: ratingSchema.parse(params.note),
    periodDays: periodSchema.parse(params.periode),
  };
}

export function reviewQueryToHref(basePath: string, query: ReviewQuery): string {
  const search = new URLSearchParams();
  if (query.rating) search.set("note", String(query.rating));
  if (query.periodDays) search.set("periode", String(query.periodDays));
  if (query.page > 1) search.set("page", String(query.page));
  const suffix = search.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function periodStart(periodDays: PeriodDays, now: Date): Date {
  return new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
}
