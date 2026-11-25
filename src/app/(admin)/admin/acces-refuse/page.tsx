import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Accès refusé" };

export default async function AdminAccessDeniedPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Accès refusé"
        description="Votre compte ne dispose pas de la permission nécessaire pour cette section."
      />
      <Panel id="acces-refuse" title="Permission insuffisante">
        <EmptyState>
          Un administrateur principal peut modifier vos permissions depuis la
          page Utilisateurs.
        </EmptyState>
        <div className="mt-5">
          <Link href="/admin" className={buttonClass("secondary")}>
            Retour au tableau de bord
          </Link>
        </div>
      </Panel>
    </>
  );
}
