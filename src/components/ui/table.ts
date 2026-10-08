/** Classes partagées des tableaux de données, pour un rendu identique dans les deux espaces. */
export const tableStyles = {
  // `relative` : les libellés `sr-only` (position absolue) restent rognés par la zone défilante.
  wrapper: "relative overflow-x-auto",
  table: "w-full border-collapse text-left text-sm",
  head: "bg-black text-xs tracking-wide text-white uppercase",
  th: "px-5 py-3 font-semibold whitespace-nowrap lg:px-6",
  row: "border-t border-black/10 transition-colors duration-200 hover:bg-gray-100",
  td: "px-5 py-4 align-middle lg:px-6",
} as const;
