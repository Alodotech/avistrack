"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Lien de navigation qui signale la page courante (visuellement et via `aria-current`). */
export function NavLink({
  href,
  exact = false,
  icon,
  children,
}: {
  href: string;
  /** La racine d'un espace ne doit pas rester active sur ses sous-pages. */
  exact?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
        active
          ? "bg-white text-black"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
