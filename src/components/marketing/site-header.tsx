"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";

const NAV = [
  { href: "#s1", label: "Générer" },
  { href: "#s2", label: "Collecter" },
  { href: "#s3", label: "Piloter" },
  { href: "#s4", label: "Sécurité" },
  { href: "/login", label: "Connexion" },
] as const;

/** Barre de navigation : fixe en haut, fond apparent au scroll. */
export function SiteHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    const progress = progressRef.current;
    if (!header || !progress) return;

    const maxScroll = () =>
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    const onScroll = () => {
      const y = window.scrollY;
      progress.style.transform = `scaleX(${Math.min(1, y / maxScroll())})`;
      header.classList.toggle("on", y > 8);
      setScrolled(y > 8);
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