import Link from "next/link";

const LEGAL = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
] as const;

/** Calculée au chargement du module : valeur stable pour le prérendu. */
const YEAR = new Date().getFullYear();

/** Pied de page institutionnel : mentions légales et contact (LP-05). */
export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-black/10 bg-black text-white">
      <div className="grid w-full gap-8 px-6 py-12 lg:grid-cols-3 lg:px-16">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full bg-accent"
            />
            AvisTrack
          </p>
          <p className="pr-8 text-sm leading-6 text-white/70">
            Collecte et analyse des avis clients par QR code, avec isolation
            stricte des données par entreprise.
          </p>
        </div>

        <nav aria-label="Informations légales" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Informations
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <p className="w-full px-6 py-5 text-xs text-white/50 lg:px-16">
          © {YEAR} AvisTrack — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
