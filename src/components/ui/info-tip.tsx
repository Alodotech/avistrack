"use client";

import { useId, useState } from "react";

/**
 * Infobulle native (aucune dépendance) : bouton « ? » qui révèle une bulle au
 * survol, au focus clavier et au clic/tactile. La bulle est retirée du flux
 * (`hidden`) quand elle est fermée : rendue seulement invisible, sa largeur
 * déborderait la carte et provoquerait un scroll horizontal sur mobile.
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
  // Sur téléphone, la carte est trop étroite pour un ancrage à droite : on
  // l'ancre à gauche, là où il reste de la place dans le viewport.
  const anchor =
    align === "right" ? "left-auto right-0 max-sm:left-0 max-sm:right-auto" : "left-0";

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
        className="relative grid size-4 shrink-0 place-items-center rounded-full border border-black/25 text-[0.6rem] leading-none font-semibold text-gray-600 transition-colors before:absolute before:-inset-3.5 before:content-[''] hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        data-open={open ? "" : undefined}
        className={`pointer-events-none absolute top-full z-40 mt-1.5 w-max max-w-[min(15rem,70vw)] rounded-md border border-black bg-white px-2.5 py-2 text-left text-xs font-normal normal-case tracking-normal leading-relaxed text-black shadow-lg shadow-black/15 transition duration-150 ${anchor} ${
          /* Sous 640 px, l'ancre est trop près du bord : la bulle devient un
             bandeau fixe en bas d'écran, jamais hors viewport. */
          "max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:mt-0 max-sm:w-auto max-sm:max-w-none max-sm:text-sm"
        } ${open ? "" : "hidden"}`}
      >
        {text}
      </span>
    </span>
  );
}
