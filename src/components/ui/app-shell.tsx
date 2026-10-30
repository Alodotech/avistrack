"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { signOutAdmin, signOutCompany } from "@/server/auth/sign-out";
import { NavLink } from "./nav-link";

const ShellSignOutContext = createContext<(() => Promise<void>) | null>(null);

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
    <ShellSignOutContext.Provider value={signOut}>
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
          <div className="min-w-0 border-b border-white/10 px-4 py-3 lg:px-5 lg:pt-5 lg:pb-4">
            <Link
              href={homeHref}
              className="flex flex-col gap-2 transition-opacity hover:opacity-90"
            >
              <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
                <Image
                  src="/assets/logoavistrack.png"
                  alt="Logo AvisTrack"
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                />
                <span>AvisTrack</span>
              </div>
              {isAdmin ? (
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-white uppercase shadow-2xs">
                    Administration
                  </span>
                </div>
              ) : (
                <p className="hidden text-xs text-white/60 lg:block">
                  Espace entreprise
                </p>
              )}
            </Link>
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
            className="hidden lg:mt-1 lg:flex lg:flex-col lg:gap-1 lg:px-3"
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

          <div className="mt-auto hidden border-t border-white/15 p-3 text-sm lg:block">
            {identity}
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

          <div className="mt-auto border-t border-white/15 p-3 text-sm">
            {identity}
          </div>
        </div>

        <main
          id="contenu"
          className="flex min-w-0 flex-1 flex-col gap-4 bg-gray-100 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:gap-8 lg:px-8 lg:py-8 2xl:px-12 2xl:py-10"
        >
          {children}
        </main>
      </div>
    </ShellSignOutContext.Provider>
  );
}

/**
 * Identité cliquable dans la coque :
 * - Affiche l'e-mail avec son initiale
 * - Au clic sur l'e-mail, ouvre un menu avec le bouton rouge « Se déconnecter »
 * - Au clic sur « Se déconnecter », ouvre la boîte de dialogue de confirmation
 */
export function ShellIdentity({
  label,
  value,
  secondary,
  logoUrl,
  planLabel,
}: {
  label: string;
  value: string;
  secondary?: string;
  logoUrl?: string | null;
  planLabel?: string;
}) {
  const signOut = useContext(ShellSignOutContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et touche Échap pour le menu déroulant
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Touche Échap pour le modal de déconnexion
  useEffect(() => {
    if (!modalOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, isSubmitting]);

  const initial = value ? value.charAt(0).toUpperCase() : "U";
  const avatarStyle = logoUrl
    ? {
        backgroundImage: `url(${logoUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Menu déroulant / popover au-dessus du mail */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full min-w-[220px] rounded-2xl border border-white/15 bg-[#151518] p-2.5 text-white shadow-2xl backdrop-blur-md z-30">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white shadow-xs"
              style={avatarStyle}
            >
              {logoUrl ? <span className="sr-only">Logo</span> : initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
                {label}
              </p>
              <p className="truncate text-xs font-semibold text-white" title={value}>
                {value}
              </p>
              {secondary ? (
                <p className="truncate text-[0.65rem] text-white/60" title={secondary}>
                  {secondary}
                </p>
              ) : null}
              {planLabel ? (
                <span className="mt-1 inline-flex rounded-full bg-orange/40 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                  {planLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="my-2 border-t border-white/10" />

          {/* Bouton Se déconnecter en rouge */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-red/10 px-3 py-2 text-xs font-semibold text-red transition-colors hover:bg-red/20 hover:text-white"
          >
            <svg
              className="size-4 shrink-0 text-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Se déconnecter</span>
          </button>
        </div>
      )}

      {/* Le bloc mail cliquable */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        className="group flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2 text-left transition-all hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold text-white transition-colors group-hover:bg-accent"
            style={avatarStyle}
          >
            {logoUrl ? <span className="sr-only">Logo</span> : initial}
          </span>
          <div className="min-w-0">
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
              {label}
            </span>
            <span
              className="block truncate text-xs font-semibold text-white/95"
              title={value}
            >
              {value}
            </span>
            {secondary ? (
              <span className="block truncate text-[0.65rem] text-white/60" title={secondary}>
                {secondary}
              </span>
            ) : null}
            {planLabel ? (
              <span className="mt-0.5 inline-flex rounded-full bg-orange/40 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                {planLabel}
              </span>
            ) : null}
          </div>
        </div>

        {/* Chevron vertical / indicateur cliquable */}
        <svg
          className={`size-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:text-white ${
            menuOpen ? "rotate-180 text-white" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Modal de confirmation de déconnexion */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Arrière-plan flou */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => !isSubmitting && setModalOpen(false)}
            aria-hidden="true"
          />

          {/* Carte du modal */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 text-black shadow-2xl animate-scaleUp">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 grid size-12 place-items-center rounded-full bg-red/10 text-accent">
                <svg
                  className="size-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>

              <h3
                id="signout-modal-title"
                className="text-lg font-bold text-black"
              >
                Confirmer la déconnexion
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                Êtes-vous sûr de vouloir vous déconnecter de votre espace AvisTrack ?
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-lg border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <form
                action={async () => {
                  if (signOut) {
                    setIsSubmitting(true);
                    await signOut();
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-deep disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Déconnexion..." : "Se déconnecter"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
