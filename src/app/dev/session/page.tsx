import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEV_IDS } from "@/server/dev/memory-store";
import { signInAsAdmin, signInAsCompany, signOutAll } from "./actions";

export const metadata: Metadata = {
  title: "Session de développement",
  robots: { index: false },
};

const COMPANIES = [
  { id: DEV_IDS.companyA, label: "Entreprise A — active, 47 avis" },
  { id: DEV_IDS.companyB, label: "Entreprise B — active, 12 avis" },
  { id: DEV_IDS.companySuspended, label: "Entreprise suspendue" },
  { id: DEV_IDS.companyPending, label: "Entreprise en attente (e-mail non vérifié)" },
];

/**
 * Sélecteur d'identité provisoire, remplacé par `/login` et `/admin/login`
 * quand l'authentification sera livrée. Introuvable en production.
 */
export default function DevSessionPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Session de développement</h1>
        <p className="text-sm text-gray-600">
          Bouchon d&apos;authentification : choisissez une identité pour ouvrir
          un dashboard. Cette page n&apos;existe pas en production.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Espace entreprise
        </h2>
        {COMPANIES.map((company) => (
          <form key={company.id} action={signInAsCompany}>
            <input type="hidden" name="companyId" value={company.id} />
            <Button type="submit" variant="secondary" className="w-full">
              {company.label}
            </Button>
          </form>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Administration
        </h2>
        <form action={signInAsAdmin}>
          <Button type="submit" variant="secondary" className="w-full">
            Administrateur de la plateforme
          </Button>
        </form>
      </section>

      <form action={signOutAll}>
        <Button type="submit" variant="ghost">
          Fermer toutes les sessions
        </Button>
      </form>
    </main>
  );
}
