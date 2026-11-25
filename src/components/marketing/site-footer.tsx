import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { CookiePreferencesButton } from "./cookie-consent";

const PRODUCT_LINKS = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/?auth=signup", label: "Créer mon compte" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions-generales", label: "Conditions générales" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/confidentialite#donnees", label: "Vos données et vos droits" },
] as const;

const LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center rounded-md text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Calculée au chargement du module : valeur stable pour le prérendu. */
const YEAR = new Date().getFullYear();

/** Pied de page institutionnel en quatre colonnes. */
export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-white/10 bg-[#090909] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 hidden size-[32rem] rounded-full bg-accent/10 blur-3xl sm:block"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-x-12 gap-y-12 border-b border-white/10 pb-12 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(130px,0.65fr)_minmax(185px,0.9fr)_minmax(320px,1.6fr)] xl:gap-x-10">
          {/* Marque */}
          <div className="flex flex-col items-start gap-5">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-3 text-2xl font-bold tracking-tight"
              aria-label="AvisTrack, accueil"
            >
              <Image
                src="/assets/logoavistrack.png"
                alt="Logo AvisTrack"
                width={38}
                height={30}
                className="h-8 w-auto shrink-0 object-contain"
              />
              <span>AvisTrack</span>
            </Link>

            <p className="max-w-xs text-sm leading-6 text-white/60">
              Collectez et analysez les avis de vos clients par QR code, avec une
              isolation stricte des données par entreprise.
            </p>

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/55 uppercase">
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                Une question ? Parlons-en.
              </p>
              <a
                href="mailto:contact@avistrack.org"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white underline-offset-4 transition-colors hover:text-white/80 hover:underline"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
                contact@avistrack.org
              </a>
            </div>
          </div>

          {/* Produit */}
          <nav aria-labelledby="footer-product">
            <h2
              id="footer-product"
              className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase"
            >
              Produit
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Légal */}
          <nav aria-labelledby="footer-legal">
            <h2
              id="footer-legal"
              className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase"
            >
              Informations
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookiePreferencesButton />
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <ContactForm />
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} AvisTrack. Tous droits réservés.</p>
          <p className="sm:text-right">
            Réalisé par{" "}
            <a
              href="https://alodotech.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/75 underline underline-offset-2 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Alodo Tech
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
