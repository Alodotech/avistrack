"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOutAdmin, signOutCompany } from "@/server/auth/sign-out";
import { NavLink } from "./nav-link";

type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

/**
 * Coque commune aux deux espaces : rail latéral noir fixe à partir de 1024 px,
 * bandeau supérieur + tiroir de navigation en dessous. Le contenu occupe tout
 * l'espace restant ; seules ses marges intérieures sont définies ici.
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
  const navLabel = isAdmin ? "Navigation administration" : "Navigation entreprise";
  const signOut = isAdmin ? signOutAdmin : signOutCompany;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Le tiroir se referme à chaque navigation.
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !drawerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const firstLink = drawerRef.current?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();
  }, [drawerOpen]);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-black"
      >
        Aller au contenu
      </a>

      <aside
        className={`sticky top-0 z-30 flex items-center justify-between gap-3 bg-black text-white lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-start ${
          isAdmin ? "border-t-4 border-red lg:border-t-0 lg:border-r-4" : ""
        }`}
      >
        <div className="min-w-0 px-4 py-3 lg:px-6 lg:py-6">
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

        <button
          type="button"
          aria-label={drawerOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
          aria-expanded={drawerOpen}
          aria-controls="app-drawer"
          onClick={() => setDrawerOpen((previous) => !previous)}
          className="mr-1 grid size-11 shrink-0 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none lg:hidden"
        >
          <span aria-hidden className="relative block h-3.5 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                drawerOpen ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute top-1.5 left-0 block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                drawerOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                drawerOpen ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>

        <nav
          aria-label={navLabel}
          className="hidden lg:mt-8 lg:flex lg:flex-col lg:gap-1 lg:px-3"
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

        <div className="mt-auto hidden border-t border-white/15 px-6 py-5 text-sm lg:block">
          {identity}
          <SignOutButton action={signOut} />
        </div>
      </aside>

      <div
        role="presentation"
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={drawerRef}
        id="app-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={navLabel}
        inert={!drawerOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(17rem,85vw)] flex-col gap-6 overflow-y-auto bg-black text-white transition-transform duration-200 ease-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        } ${isAdmin ? "border-r-4 border-red" : ""}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <span className="text-sm font-semibold tracking-wide text-white/60 uppercase">
            {isAdmin ? "Administration" : "Menu"}
          </span>
          <button
            type="button"
            aria-label="Fermer la navigation"
            onClick={() => setDrawerOpen(false)}
            className="grid size-11 shrink-0 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3">
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

        <div className="mt-auto border-t border-white/15 px-5 py-5 text-sm">
          {identity}
          <SignOutButton action={signOut} />
        </div>
      </div>

      <main
        id="contenu"
        className="flex min-w-0 flex-1 flex-col gap-4 bg-gray-100 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:gap-8 lg:px-8 lg:py-8 2xl:px-12 2xl:py-10"
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
      <span className="block max-w-52 truncate font-semibold" title={value}>
        {value}
      </span>
    </>
  );
}

/** Déconnexion explicite (T35) : la session est fermée côté serveur. */
function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="mt-4">
      <button
        type="submit"
        className="rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
      >
        Se déconnecter
      </button>
    </form>
  );
}
