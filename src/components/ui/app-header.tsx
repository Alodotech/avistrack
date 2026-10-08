import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string };

/**
 * Barre de navigation noire commune aux deux espaces. L'espace Admin porte un
 * liseré rouge et une étiquette, pour ne jamais être confondu avec l'espace
 * entreprise (§13.3).
 */
export function AppHeader({
  area,
  homeHref,
  items,
  identity,
}: {
  area: "company" | "admin";
  homeHref: string;
  items: NavItem[];
  /** Zone lue depuis la session : fournie sous `<Suspense>` par l'appelant. */
  identity: ReactNode;
}) {
  const isAdmin = area === "admin";

  return (
    <header
      className={`bg-black text-white ${isAdmin ? "border-t-4 border-red" : ""}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-2 font-semibold">
          AvisTrack
          {isAdmin ? (
            <span className="rounded bg-red px-1.5 py-0.5 text-xs uppercase tracking-wide">
              Administration
            </span>
          ) : null}
        </Link>
        <nav
          aria-label={isAdmin ? "Navigation administration" : "Navigation entreprise"}
          className="flex gap-4 text-sm"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="underline-offset-4 hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-sm">{identity}</div>
      </div>
    </header>
  );
}
