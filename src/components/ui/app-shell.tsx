import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";

type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

/**
 * Coque commune aux deux espaces, en pleine largeur : barre latérale noire
 * fixe à partir de 1024 px, bandeau supérieur en dessous. Le contenu occupe
 * tout l'espace restant ; seules ses marges intérieures sont définies ici.
 *
 * L'espace Admin porte un liseré rouge et une étiquette, pour ne jamais être
 * confondu avec l'espace entreprise (§13.3).
 */
export function AppShell({
  area,
  homeHref,
  items,
  identity,
  children,
}: {
  area: "company" | "admin";
  homeHref: string;
  items: NavItem[];
  /** Zone lue depuis la session : fournie sous `<Suspense>` par l'appelant. */
  identity: ReactNode;
  children: ReactNode;
}) {
  const isAdmin = area === "admin";

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-black"
      >
        Aller au contenu
      </a>

      <aside
        className={`grid grid-cols-[1fr_auto] items-center gap-x-4 bg-black text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:items-stretch ${
          isAdmin ? "border-t-4 border-red" : ""
        }`}
      >
        <div className="px-4 py-4 lg:px-6 lg:py-6">
          <Link
            href={homeHref}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold tracking-tight"
          >
            AvisTrack
            {isAdmin ? (
              <span className="rounded bg-red px-1.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
                Administration
              </span>
            ) : null}
          </Link>
          {isAdmin ? null : (
            <p className="hidden text-xs text-white/60 lg:block">
              Espace entreprise
            </p>
          )}
        </div>

        <div className="min-w-0 px-4 py-4 text-right text-sm lg:order-last lg:mt-auto lg:border-t lg:border-white/15 lg:px-6 lg:py-5 lg:text-left">
          {identity}
        </div>

        <nav
          aria-label={
            isAdmin ? "Navigation administration" : "Navigation entreprise"
          }
          className="col-span-2 flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:px-3 lg:pb-0"
        >
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              exact={item.exact}
              icon={item.icon}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main
        id="contenu"
        className="flex min-w-0 flex-1 flex-col gap-6 bg-gray-100 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8 lg:py-8 2xl:px-12 2xl:py-10"
      >
        {children}
      </main>
    </div>
  );
}

/** Identité affichée dans la coque : un libellé discret et la valeur. */
export function ShellIdentity({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <span className="hidden text-xs text-white/60 lg:block">{label}</span>
      <span className="block truncate font-semibold" title={value}>
        {value}
      </span>
    </>
  );
}
