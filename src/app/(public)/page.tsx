import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import {
  DashboardScreen,
  PhoneFormScreen,
  QrStandScreen,
} from "@/components/landing/product-screens";

export const metadata: Metadata = {
  title: "Des avis clients. Un seul scan.",
  description:
    "Un QR code, un formulaire et un tableau de bord pour recueillir les avis de vos clients. AvisTrack, la satisfaction en un seul scan.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AvisTrack — Des avis clients. Un seul scan.",
    description:
      "Un QR code, un formulaire mobile et un tableau de bord pour recueillir les avis de vos clients.",
    locale: "fr_FR",
    type: "website",
    siteName: "AvisTrack",
  },
};

function ChapterIndex({ current }: { current: string }) {
  return (
    <span className="chapter-index" aria-hidden>
      {current}
      <i />
      06
    </span>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Héros — la promesse */}
      <section id="hero" className="chapter" aria-labelledby="hero-title">
        <div className="chapter-inner">
          <ScrollReveal className="copy-block">
            <p className="eyebrow">
              <span className="ink-dot" aria-hidden />
              AvisTrack
              <span>Avis clients par QR code</span>
            </p>
            <h1 className="heading display" id="hero-title">
              Des avis clients.
              <span className="heading-muted">Un seul scan.</span>
            </h1>
            <p className="lead">
              Votre client garde son avis pour lui, faute de s&apos;y laisser
              inviter. Posez un QR code sur le comptoir : il note en 30 secondes,
              et le retour arrive directement dans votre tableau de bord.
            </p>
            <div className="cta-row">
              <Link href="/onboarding" className={buttonClass("primary")}>
                Créer mon QR code
              </Link>
              <a href="#s1" className="text-link">
                Comment ça marche ↓
              </a>
            </div>
            <p className="hero-note">
              <span className="note-rule" aria-hidden />
              Prêt en 2 minutes, dès maintenant.
            </p>
          </ScrollReveal>
          <ChapterIndex current="01" />
        </div>
      </section>

      {/* 01 — Générez */}
      <section id="s1" className="chapter" aria-labelledby="s1-title">
        <div className="chapter-inner chapter-inner--split">
          <ScrollReveal className="copy-block">
            <p className="eyebrow">
              <span className="chapter-number">01</span>
              <span>Commencer</span>
            </p>
            <h2 className="heading" id="s1-title">
              Un QR code
              <span className="heading-muted">pour votre commerce.</span>
            </h2>
            <p className="lead">
              Pas de design à bricoler : vous générez un code unique pour votre
              établissement, vous le téléchargez, vous l&apos;imprimez. C&apos;est
              tout.
            </p>
            <ul className="feature-list">
              <li>Unique à votre établissement</li>
              <li>Éditable et ré-imprimable à volonté</li>
            </ul>
          </ScrollReveal>
          <ScrollReveal className="screen-block" delay={140}>
            <QrStandScreen />
          </ScrollReveal>
          <ChapterIndex current="02" />
        </div>
      </section>

      {/* 02 — Affichez */}
      <section id="s2" className="chapter" aria-labelledby="s2-title">
        <div className="chapter-inner chapter-inner--split">
          <ScrollReveal className="copy-block">
            <p className="eyebrow">
              <span className="chapter-number">02</span>
              <span>En caisse, au pas de la porte</span>
            </p>
            <h2 className="heading" id="s2-title">
              Ils scannent,
              <span className="heading-muted">ils notent, ils envoient.</span>
            </h2>
            <p className="lead">
              Le formulaire s&apos;ouvre dans leur téléphone, tout seul. Pas
              d&apos;application, pas de compte : juste 30 secondes pour dire, en
              toute franchise, ce qu&apos;ils ont vécu.
            </p>
            <p className="proof">
              Scannez · 30 secondes · sans compte
            </p>
          </ScrollReveal>
          <ScrollReveal className="screen-block" delay={140}>
            <PhoneFormScreen />
          </ScrollReveal>
          <ChapterIndex current="03" />
        </div>
      </section>

      {/* 03 — Pilotez */}
      <section id="s3" className="chapter" aria-labelledby="s3-title">
        <div className="chapter-inner chapter-inner--split chapter-inner--wide">
          <ScrollReveal className="copy-block">
            <p className="eyebrow">
              <span className="chapter-number">03</span>
              <span>Le tableau de bord</span>
            </p>
            <h2 className="heading" id="s3-title">
              Tout remonte,
              <span className="heading-muted">au même endroit.</span>
            </h2>
            <p className="lead">
              Note moyenne, répartition, liste : chaque avis arrive dans votre
              tableau de bord, trié par établissement. Vous savez enfin ce qui
              se passe vraiment en salle.
            </p>
            <ul className="feature-list">
              <li>Note moyenne et tendances, en temps réel</li>
              <li>Répondez, archivez, partagez</li>
            </ul>
          </ScrollReveal>
          <ScrollReveal className="screen-block" delay={140}>
            <DashboardScreen />
          </ScrollReveal>
          <ChapterIndex current="04" />
        </div>
      </section>

      {/* 04 — Sécurité / isolation */}
      <section id="s4" className="chapter security" aria-labelledby="s4-title">
        <div className="chapter-inner">
          <ScrollReveal className="copy-block">
            <p className="eyebrow">
              <span className="chapter-number">04</span>
              <span>Données</span>
            </p>
            <h2 className="heading" id="s4-title">
              Vos avis
              <span className="heading-muted">vous appartiennent.</span>
            </h2>
            <p className="lead">
              Chaque entreprise dispose de son espace isolé. L&apos;avis laissé
              chez vous n&apos;apparaît jamais auprès d&apos;un autre commerce.
            </p>
            <ul className="feature-list security-list">
              <li>
                Chaque espace ne voit que ses propres avis
              </li>
              <li>
                Le client laisse son avis sans créer de compte
              </li>
              <li>
                La séparation est pensée dès la conception
              </li>
            </ul>
          </ScrollReveal>
          <ChapterIndex current="05" />
        </div>
      </section>

      {/* 05 — CTA final */}
      <section
        id="s5"
        className="chapter finale"
        aria-labelledby="s5-title"
      >
        <div className="chapter-inner">
          <ScrollReveal className="copy-block finale-block">
            <p className="eyebrow">
              <span className="chapter-number">05</span>
              <span>La suite</span>
            </p>
            <h2 className="heading finale" id="s5-title">
              Vos clients parlent.
              <span className="heading-muted">Écoutez-les.</span>
            </h2>
            <p className="lead finale-lead">
              Créez votre espace, générez votre QR code, et découvrez ce que
              vos clients attendent de vous.
            </p>
            <div className="cta-row centered">
              <Link href="/onboarding" className={buttonClass("primary")}>
                Créer mon QR code ↗
              </Link>
              <a
                className={buttonClass("secondary")}
                href="mailto:contact@avistrack.com?subject=AvisTrack%20-%20Demande%20de%20renseignements"
              >
                Nous contacter
              </a>
            </div>
            <p className="finale-foot">
              <span className="note-rule" aria-hidden />
              Commerce indépendant · Franchise · Hôtellerie · Restauration
            </p>
          </ScrollReveal>
          <ChapterIndex current="06" />
        </div>
      </section>
    </>
  );
}