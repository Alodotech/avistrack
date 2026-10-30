import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./contact-form";

const PRODUCT_LINKS = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/?auth=signup", label: "Créer mon compte" },
  { href: "/?auth=login", label: "Espace entreprise" },
  { href: "/admin/login", label: "Espace administration" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/confidentialite#donnees", label: "Vos données et vos droits" },
] as const;

const LINK_CLASS =
  "inline-flex min-h-9 items-center text-sm text-white/65 underline-offset-4 transition-colors hover:text-white hover:underline";

/** Calculée au chargement du module : valeur stable pour le prérendu. */
const YEAR = new Date().getFullYear();

/** Pied de page institutionnel en quatre colonnes. */
export function SiteFooter() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 size-[28rem] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 pt-16 pb-8 lg:px-16 lg:pt-20">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_0.7fr_1.4fr] xl:gap-10">
          {/* Marque */}
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-xl font-bold tracking-tight"
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

            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Une question ?
            </p>
            <a
              href="mailto:contact@avistrack.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:text-white/80 hover:underline"
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
              contact@avistrack.com
            </a>
          </div>

          {/* Produit */}
          <nav aria-labelledby="footer-product">
            <h2
              id="footer-product"
              className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase"
            >
              Produit
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
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
              className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase"
            >
              Légal
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="mailto:contact@avistrack.com" className={LINK_CLASS}>
                  Nous écrire
                </a>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
              Contact
            </h2>
            <a
              href="https://alodotech.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              Contacter l&apos;&eacute;quipe
            </a>
            <div className="mt-4">
              <ContactForm />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} AvisTrack — Tous droits réservés.</p>
          <p>Collecte d&apos;avis par QR code · Données isolées par entreprise</p>
        </div>
      </div>
    </footer>
  );
}
