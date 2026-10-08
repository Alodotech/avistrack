import Link from "next/link";
import { pageCount } from "@/lib/pagination";
import { buttonClass } from "./button";

/**
 * Pagination par liens : fonctionne sans JavaScript.
 * `hrefForPage` conserve les filtres courants dans l'URL.
 */
export function Pagination({
  page,
  total,
  pageSize,
  hrefForPage,
  label,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
  label: string;
}) {
  const pages = pageCount(total, pageSize);
  if (pages <= 1) return null;

  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-4">
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={buttonClass("secondary", page <= 1 ? disabled : "")}
      >
        Précédent
      </Link>
      <p className="text-sm text-gray-600">
        Page {page} sur {pages}
      </p>
      <Link
        href={hrefForPage(Math.min(pages, page + 1))}
        aria-disabled={page >= pages}
        tabIndex={page >= pages ? -1 : undefined}
        className={buttonClass("secondary", page >= pages ? disabled : "")}
      >
        Suivant
      </Link>
    </nav>
  );
}
