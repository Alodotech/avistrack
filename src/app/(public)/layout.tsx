import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Scene3DLoader } from "@/components/landing/scene3d-loader";

/** Surface publique : landing, formulaire d'avis et inscription. */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://avistrack.fr",
  ),
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Scene3DLoader />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-black focus:ring-2 focus:ring-red"
      >
        Aller au contenu
      </a>
      <SiteHeader />
      <main id="contenu" className="relative z-10 flex flex-1 flex-col">
        {children}
      </main>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </div>
  );
}