import { z } from "zod";
import { firstValue } from "./pagination";

/**
 * Filtres de la liste administrative des entreprises (T32).
 *
 * Tous les filtres sont lus depuis l'URL : ils sont partageables, et le
 * filtrage se fait en base, jamais dans le navigateur.
 */

export const COMPANY_DATE_MODES = [
  "tous",
  "aujourdhui",
  "mois",
  "annee",
  "plage",
] as const;
export type CompanyDateMode = (typeof COMPANY_DATE_MODES)[number];

export const COMPANY_STATUS_FILTERS = ["all", "active", "suspended"] as const;
export type CompanyStatusFilter = (typeof COMPANY_STATUS_FILTERS)[number];

export type CompanyFilters = {
  /** Recherche libre sur le nom, l'e-mail ou le téléphone. */
  search: string;
  status: CompanyStatusFilter;
  dateMode: CompanyDateMode;
  /** Date de début au format `AAAA-MM-JJ` (mode « plage »). */
  startDate: string;
  /** Date de fin au format `AAAA-MM-JJ` (mode « plage »). */
  endDate: string;
};

export const EMPTY_COMPANY_FILTERS: CompanyFilters = {
  search: "",
  status: "all",
  dateMode: "tous",
  startDate: "",
  endDate: "",
};

export const SEARCH_MAX_LENGTH = 100;

/**
 * Neutralise les métacaractères d'une recherche libre.
 *
 * `%` et `_` sont des jokers pour `ILIKE`, `,` `(` `)` cassent la syntaxe du
 * filtre `or` de PostgREST, `*` en est le joker et `\` l'échappement par
 * défaut de `LIKE` : tous sont retirés pour qu'une recherche reste
 * strictement littérale.
 */
export function escapeSearchPattern(value: string): string {
  return value.replace(/[%,()_*\\]/g, "");
}

/** Nombre maximal de lignes exportables (garde-fou mémoire). */
export const EXPORT_MAX_ROWS = 5000;

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .catch("");

const statusSchema = z
  .preprocess(firstValue, z.enum(COMPANY_STATUS_FILTERS))
  .catch("all");

const dateModeSchema = z
  .preprocess(firstValue, z.enum(COMPANY_DATE_MODES))
  .catch("tous");

/** Lit les filtres depuis l'URL ; une valeur invalide est ignorée. */
export function parseCompanyFilters(
  params: Record<string, string | string[] | undefined>,
): CompanyFilters {
  const search = (firstValue(params.q) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const status = statusSchema.parse(params.statut);
  const dateMode = dateModeSchema.parse(params.periode);
  const startDate = dateSchema.parse(firstValue(params.du));
  const endDate = dateSchema.parse(firstValue(params.au));

  return {
    search,
    status,
    dateMode,
    // Une plage n'a de sens qu'explicitement demandée.
    startDate: dateMode === "plage" ? startDate : "",
    endDate: dateMode === "plage" ? endDate : "",
  };
}

/** Reconstruit l'URL de la liste à partir des filtres. */
export function companyFiltersToHref(
  basePath: string,
  filters: CompanyFilters,
): string {
  const search = new URLSearchParams();
  if (filters.search) search.set("q", filters.search);
  if (filters.status !== "all") search.set("statut", filters.status);
  if (filters.dateMode !== "tous") search.set("periode", filters.dateMode);
  if (filters.dateMode === "plage") {
    if (filters.startDate) search.set("du", filters.startDate);
    if (filters.endDate) search.set("au", filters.endDate);
  }
  const suffix = search.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

/** Bornes temporelles des filtres, bornes au moment de la requête. */
export type DateRange = {
  /** Borne basse incluse. */
  from?: Date;
  /** Borne haute incluse. */
  to?: Date;
};

/** Traduit le mode de période en bornes temporelles. */
export function resolveDateRange(
  filters: CompanyFilters,
  now: Date,
): DateRange {
  const day = (value: Date) =>
    new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

  switch (filters.dateMode) {
    case "aujourdhui": {
      const from = day(now);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { from, to };
    }
    case "mois": {
      const from = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      const to = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
      );
      return { from, to: new Date(to.getTime() - 1) };
    }
    case "annee": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      const to = new Date(
        Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0),
      );
      return { from, to: new Date(to.getTime() - 1) };
    }
    case "plage": {
      const from = filters.startDate
        ? new Date(`${filters.startDate}T00:00:00.000Z`)
        : undefined;
      const to = filters.endDate
        ? new Date(`${filters.endDate}T23:59:59.999Z`)
        : undefined;
      return { from, to };
    }
    default:
      return {};
  }
}

const DATE_MODE_LABELS: Record<CompanyDateMode, string> = {
  tous: "Toutes les périodes",
  aujourdhui: "Aujourd'hui",
  mois: "Ce mois-ci",
  annee: "Cette année",
  plage: "Plage personnalisée",
};

const STATUS_LABELS: Record<CompanyStatusFilter, string> = {
  all: "Tous les statuts",
  active: "Entreprises actives",
  suspended: "Entreprises suspendues",
};

/** Période affichée dans les exports (PDF, Excel). */
export function describeCompanyFilters(filters: CompanyFilters): string {
  if (filters.dateMode === "plage") {
    const from = filters.startDate || "…";
    const to = filters.endDate || "…";
    return `Période : du ${from} au ${to}`;
  }
  return `Période : ${DATE_MODE_LABELS[filters.dateMode]}`;
}

/** Statut affiché dans les exports. */
export function describeCompanyStatus(filters: CompanyFilters): string {
  return STATUS_LABELS[filters.status];
}
