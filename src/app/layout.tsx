import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://avistrack.org"),
  title: {
    default: "AvisTrack",
    template: "%s — AvisTrack",
  },
  description:
    "Collecte et analyse des avis clients par QR code, avec isolation stricte des données par entreprise.",
  openGraph: {
    title: "AvisTrack — Des avis clients. Un seul scan.",
    description:
      "Un QR code, un formulaire mobile et un tableau de bord pour recueillir les avis de vos clients.",
    url: "https://avistrack.org",
    siteName: "AvisTrack",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AvisTrack — Des avis clients. Un seul scan.",
    description:
      "Un QR code, un formulaire mobile et un tableau de bord pour recueillir les avis de vos clients.",
  },
  other: {
    // Empêche l'extension Dark Reader de réécrire le DOM avant l'hydratation.
    "darkreader-lock": "true",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col font-sans">{children}</body>
    </html>
  );
}
