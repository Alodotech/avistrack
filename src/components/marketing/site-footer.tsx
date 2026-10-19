import Image from "next/image";
import Link from "next/link";

const PRODUCT_LINKS = [
  { href: "#hero", label: "Accueil" },
  { href: "#s1", label: "Comment ça marche" },
  { href: "#s2", label: "Plaque & QR code" },
  { href: "#s3", label: "Tableau de bord" },
  { href: "#s4", label: "Sécurité & Isolation" },
] as const;

const PRO_LINKS = [
  { href: "/login", label: "Connexion commerce" },
  { href: "/onboarding", label: "Créer un QR code" },
  { href: "/admin/login", label: "Espace Administration" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "mailto:contact@avistrack.com", label: "contact@avistrack.com" },
] as const;

const YEAR = new Date().getFullYear();

/** Pied de page institutionnel 4 colonnes (LP-05). */
export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:px-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Colonne 1 : Marque & Présentation */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white"
              aria-label="AvisTrack, accueil"
            >
              <Image
                src="/assets/logo.png"
                alt=""
                width={32}
                height={25}
                className="h-7 w-auto shrink-0 object-contain"
              />
              <span>AvisTrack</span>
            </Link>
            <p className="text-sm leading-6 text-white/70">
              Solution complète de collecte et d&apos;analyse des avis clients en point
              de vente. Un QR code, un formulaire ultra-rapide et un tableau de bord en direct.
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
              <span className="inline-block size-2 rounded-full bg-accent" />
              <span>Données isolées et souveraines</span>
            </div>
          </div>

          {/* Colonne 2 : Produit */}
          <nav aria-label="Fonctionnalités du produit" className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Produit
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Colonne 3 : Espaces Professionnels */}
          <nav aria-label="Espaces professionnels" className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Espace Pro
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {PRO_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Colonne 4 : Informations légales & Contact */}
          <nav aria-label="Informations légales et support" className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Légal & Contact
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith("mailto:") ? (
                    <a
                      href={item.href}
                      className="text-white/70 transition-colors hover:text-white"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-white/70 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Barre inférieure de copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row">
          <p>© {YEAR} AvisTrack. Tous droits réservés.</p>
          <p>
            Réalisé par{" "}
            <a
              href="https://alodotech.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Alodo Tech
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
