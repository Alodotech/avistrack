"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type {
  CompanyDateMode,
  CompanyFilters,
  CompanyStatusFilter,
} from "@/lib/company-filters";
import { SEARCH_MAX_LENGTH } from "@/lib/company-filters";

const DATE_MODES: { value: CompanyDateMode; label: string }[] = [
  { value: "tous", label: "Toutes les périodes" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "mois", label: "Ce mois-ci" },
  { value: "annee", label: "Cette année" },
  { value: "plage", label: "Plage personnalisée" },
];

const STATUS_MODES: { value: CompanyStatusFilter; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Entreprises actives" },
  { value: "suspended", label: "Entreprises suspendues" },
];

/**
 * Filtres de la liste administrative (T32).
 *
 * Les filtres vivent dans l'URL : ils sont partageables, et le filtrage se
 * fait en base. Le formulaire est un GET classique, il fonctionne donc sans
 * JavaScript ; celui-ci ne sert qu'à afficher les dates de la plage
 * personnalisée au moment voulu.
 */
export function DateFilters({
  filters,
  action,
  children,
}: {
  filters: CompanyFilters;
  /** Chemin de la liste filtrée. */
  action: string;
  /** Boutons supplémentaires (exports). */
  children?: ReactNode;
}) {
  const [mode, setMode] = useState<CompanyDateMode>(filters.dateMode);

  return (
    <form
      method="get"
      action={action}
      role="search"
      className="flex flex-wrap items-end gap-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
        <label
          htmlFor="company-search"
          className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
        >
          Rechercher
        </label>
        <input
          id="company-search"
          type="search"
          name="q"
          defaultValue={filters.search}
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="Nom, e-mail ou téléphone"
          className="min-h-11 w-full rounded-md border border-black/30 px-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="company-status"
          className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
        >
          Statut
        </label>
        <select
          id="company-status"
          name="statut"
          defaultValue={filters.status}
          className="min-h-11 rounded-md border border-black/30 bg-white px-3 text-sm"
        >
          {STATUS_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="company-period"
          className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
        >
          Période
        </label>
        <select
          id="company-period"
          name="periode"
          value={mode}
          onChange={(event) => setMode(event.target.value as CompanyDateMode)}
          className="min-h-11 rounded-md border border-black/30 bg-white px-3 text-sm"
        >
          {DATE_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {mode === "plage" ? (
        <>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="company-from"
              className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
            >
              Du
            </label>
            <input
              id="company-from"
              type="date"
              name="du"
              defaultValue={filters.startDate}
              className="min-h-11 rounded-md border border-black/30 px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="company-to"
              className="text-xs font-semibold tracking-wide text-gray-600 uppercase"
            >
              Au
            </label>
            <input
              id="company-to"
              type="date"
              name="au"
              defaultValue={filters.endDate}
              className="min-h-11 rounded-md border border-black/30 px-3 text-sm"
            />
          </div>
        </>
      ) : null}

      <Button type="submit" variant="secondary">
        Filtrer
      </Button>

      {children}
    </form>
  );
}
