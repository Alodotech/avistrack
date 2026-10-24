import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeletedAccountScreen } from "@/components/auth/deleted-account-screen";
import {
  ADMIN_HOME_PATH,
  COMPANY_HOME_PATH,
} from "@/server/auth/guards";
import { getAccountState } from "@/server/auth/account-state";

export const metadata: Metadata = { title: "Connexion" };

/**
 * Page de connexion.
 *
 * La destination dépend de l'état du compte : une entreprise va à son
 * tableau de bord, un administrateur à l'espace d'administration, un compte
 * sans fiche entreprise à l'onboarding. Le proxy ne fait plus ce travail :
 * c'est ici que la boucle de redirection était née.
 */
export default async function LoginPage() {
  const state = await getAccountState();

  if (state.kind === "company") redirect(COMPANY_HOME_PATH);
  if (state.kind === "admin") redirect(ADMIN_HOME_PATH);
  if (state.kind === "deleted") return <DeletedAccountScreen />;

  // Plus de page isolée : ouverture directe de la modale de connexion
  redirect("/?auth=login");
}
