"use client";

import { useId, useState } from "react";

/**
 * Infobulle native (aucune dépendance) : bouton « ? » qui révèle une bulle au
 * survol, au focus clavier et au clic/tactile. Accessible via `aria-describedby`.
 */
export function InfoTip({
  text,
  className = "",
  align = "left",
}: {
  text: string;
  className?: string;
  /** Côté depuis lequel la bulle s'étend : `left` la garde dans l'écran. */
  align?: "left" | "right";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = align === "right" ? "right-0" : "left-0";

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={id}
        aria-label={`À propos : ${text}`}
        onClick={() => setOpen((previous) => !previous)}
        className="grid size-4 shrink-0 place-items-center rounded-full border border-black/25 text-[0.6rem] leading-none font-semibold text-gray-600 transition-colors hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        data-open={open ? "" : undefined}
        className={`pointer-events-none absolute top-full z-40 mt-1.5 w-max max-w-[15rem] rounded-md border border-black bg-white px-2.5 py-2 text-left text-xs leading-relaxed text-black shadow-lg shadow-black/15 transition duration-150 ${anchor} ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
