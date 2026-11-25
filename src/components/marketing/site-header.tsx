"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";

import { useAuthModal } from "@/components/auth/auth-modal-context";

const NAV = [
  { href: "/#s1", label: "Fonctionnement" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/#s4", label: "Sécurité" },
  { href: "#contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openLogin, openSignup } = useAuthModal();

  useEffect(() => {
    const header = headerRef.current;
    const progress = progressRef.current;
    if (!header || !progress) return;

    const maxScroll = () =>
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const velocity = y - lastY;
      lastY = y;
      progress.style.transform = `scaleX(${Math.min(1, y / maxScroll())})`;
      header.classList.toggle("on", y > 8);
      if (
        y <= 24 ||
        document.activeElement?.closest(".site-header")
      ) {
        header.classList.remove("hide");
      } else if (velocity > 0) {
        header.classList.add("hide");
      } else if (velocity < 0) {
        header.classList.remove("hide");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div ref={progressRef} className="scroll-progress" aria-hidden />
      <header ref={headerRef} className="site-header">
        <div className="site-header-inner">
          <Link
            href="/"
            className="site-logo"
            aria-label="AvisTrack, accueil"
          >
            <Image
              src="/assets/logoavistrack.png"
              alt="Logo AvisTrack"
              width={38}
              height={30}
              className="h-8 w-auto shrink-0 object-contain"
              priority
            />
            <span>AvisTrack</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMenuOpen}
            className="grid size-11 shrink-0 place-items-center rounded-md text-black transition-colors hover:bg-gray-100"
          >
            {isMenuOpen ? (
              <XIcon className="size-5" />
            ) : (
              <span aria-hidden className="block h-3.5 w-5">
                <span className="block h-0.5 w-full rounded-full bg-current" />
                <span className="mt-1 block h-0.5 w-full rounded-full bg-current" />
                <span className="mt-1 block h-0.5 w-full rounded-full bg-current" />
              </span>
            )}
          </button>

          <nav
            aria-label="Navigation principale"
            className="site-nav hidden md:flex md:flex-row"
          >
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                openLogin();
              }}
              className="cursor-pointer text-sm font-semibold transition-colors hover:text-accent py-2 px-4 min-h-[44px]"
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                openSignup();
              }}
              className={buttonClass("primary")}
            >
              Créer mon compte
            </button>
          </nav>

          {isMenuOpen && (
            <div
              className="md:hidden absolute top-full left-0 right-0 border-t border-black/10 bg-white py-4 px-6 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="space-y-3">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-sm font-medium text-black hover:text-accent py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openLogin();
                  }}
                  className="w-full cursor-pointer text-sm font-semibold text-black transition-colors hover:text-accent py-3 px-4 border border-black/10 rounded-xl text-left"
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openSignup();
                  }}
                  className={buttonClass("primary") + " w-full"}
                >
                  Créer mon compte
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
