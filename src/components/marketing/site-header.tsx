"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";

const NAV = [
  { href: "#s1", label: "Fonctionnement" },
  { href: "#s4", label: "Sécurité" },
  { href: "#s5", label: "Tarifs" },
  { href: "/login", label: "Connexion" },
] as const;

/** Barre de navigation : se masque au défilement vers le bas, revient vers le haut. */
export function SiteHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

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
            <span aria-hidden className="logo-mark" />
            <span>AVISTRACK</span>
          </Link>

          <nav aria-label="Navigation principale" className="site-nav">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <Link href="/onboarding" className={buttonClass("primary")}>
              Créer mon compte
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}