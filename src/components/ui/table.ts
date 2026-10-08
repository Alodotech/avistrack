/** Classes partagées des tableaux de données, pour un rendu identique dans les deux espaces. */
export const tableStyles = {
  // `relative` : les libellés `sr-only` (position absolue) restent rognés par la zone défilante.
  wrapper: "relative overflow-x-auto",
  table: "w-full border-collapse text-left text-sm",
  head: "bg-black text-xs tracking-wide text-white uppercase",
  th: "px-3 py-3 font-semibold whitespace-nowrap first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6",
  row: "border-t border-black/10 transition-colors duration-200 hover:bg-gray-100",
  td: "px-3 py-4 align-middle first:pl-5 last:pr-5 lg:first:pl-6 lg:last:pr-6",
} as const;
