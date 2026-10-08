import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { PERIOD_OPTIONS, type ReviewQuery } from "@/lib/review-query";
import { RATINGS } from "@/lib/review-stats";

const selectClass =
  "min-h-11 rounded border border-black/30 bg-white px-3 text-sm";

/** DE-07 : formulaire GET, donc utilisable sans JavaScript et partageable par URL. */
export function ReviewFilters({ query }: { query: ReviewQuery }) {
  const hasFilter = Boolean(query.rating || query.periodDays);

  return (
    <form
      method="get"
      action="/dashboard"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-rating" className="text-sm font-semibold">
          Note
        </label>
        <select
          id="filter-rating"
          name="note"
          defaultValue={query.rating ?? ""}
          className={selectClass}
        >
          <option value="">Toutes les notes</option>
          {[...RATINGS].reverse().map((rating) => (
            <option key={rating} value={rating}>
              {rating} {rating > 1 ? "étoiles" : "étoile"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-period" className="text-sm font-semibold">
          Période
        </label>
        <select
          id="filter-period"
          name="periode"
          defaultValue={query.periodDays ?? ""}
          className={selectClass}
        >
          <option value="">Depuis le début</option>
          {PERIOD_OPTIONS.map((period) => (
            <option key={period.days} value={period.days}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary">
        Filtrer
      </Button>
      {hasFilter ? (
        <Link href="/dashboard" className={buttonClass("ghost")}>
          Réinitialiser
        </Link>
      ) : null}
    </form>
  );
}
