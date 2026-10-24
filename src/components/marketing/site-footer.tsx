import Image from "next/image";
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
    <footer id="contact" className="bg-black text-white">
      <div className="grid w-full gap-6 px-6 py-9 lg:grid-cols-3 lg:gap-8 lg:px-16 lg:py-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <Image
              src="/assets/logoavistrack.png"
              alt="Logo AvisTrack"
              width={32}
              height={25}
              className="h-7 w-auto shrink-0 object-contain"
            />
            <span>AvisTrack</span>
          </div>
          <p className="pr-8 text-sm leading-6 text-white/70">
            Collecte et analyse des avis clients par QR code, avec isolation
            stricte des données par entreprise.
          </p>
        </div>

        <nav aria-label="Informations légales" className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Informations
          </h2>
          {/* Les liens font déjà 44 px de haut : pas d'écart à ajouter. */}
          <ul className="flex flex-col text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div>
        <p className="w-full px-6 py-5 text-xs text-white/50 lg:px-16">
          © {YEAR} AvisTrack — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
