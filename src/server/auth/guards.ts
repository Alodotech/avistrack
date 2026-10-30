import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type {
  Admin,
  AdminModule,
  AdminPermissionLevel,
  Company,
} from "@/server/domain";
import { needsCompanyOnboarding } from "@/server/services/company-onboarding";
import { isCompanyAccessBlocked } from "@/server/services/company-access";
import { getAccountState } from "./account-state";

/**
 * Gardes d'accès : unique endroit où l'identité est extraite de la session.
 * Tout `companyId` passé à un repository doit provenir de ces fonctions.
 *
 * Chaque état possible de la session a une destination propre : sans cela,
 * un administrateur ou une entreprise supprimée était renvoyé vers `/login`,
 * qui le renvoyait vers `/dashboard`, qui le renvoyait vers `/login`…
 * (boucle de redirection).
 */

export const COMPANY_LOGIN_PATH = "/?auth=login";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ONBOARDING_PATH = "/onboarding";
export const COMPANY_HOME_PATH = "/dashboard";
export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_ACCESS_DENIED_PATH = "/admin/acces-refuse";

/** Entreprise de la session, ou `null` (pas de session, compte supprimé). */
export const getCurrentCompany = cache(async (): Promise<Company | null> => {
  const state = await getAccountState();
  return state.kind === "company" ? state.company : null;
});

export type CompanyGuardOptions = {
  /** Autorise une fiche encore incomplète (paiement, résiliation…). */
  allowOnboarding?: boolean;
  /** Autorise l'accès malgré un abonnement expiré (abonnement, profil). */
  allowExpired?: boolean;
};

/**
 * Pour les pages : redirige vers la destination adaptée à l'état du compte.
 *
 * Deux verrous s'ajoutent à l'authentification :
 * - un compte dont la fiche est incomplète **ou** qui n'a aucun forfait
 *   enregistré repart à `/onboarding` (le choix du forfait ne peut pas être
 *   contourné en rechargeant la page) ;
 * - un abonnement expiré ou suspendu renvoie vers `/dashboard/abonnement`, la
 *   seule page (avec le profil) qui reste accessible.
 */
export async function requireCompany(
  options: CompanyGuardOptions = {},
): Promise<Company> {
  const state = await getAccountState();
  if (state.kind === "company") {
    if (state.company.status === "ACTIVE") {
      if (
        !options.allowOnboarding &&
        (await needsCompanyOnboarding(state.company))
      ) {
        redirect(ONBOARDING_PATH);
      }
      if (
        !options.allowExpired &&
        (await isCompanyAccessBlocked(state.company))
      ) {
        redirect(`${COMPANY_HOME_PATH}/abonnement?expired=1`);
      }
    }
    return state.company;
  }
  if (state.kind === "admin") redirect(ADMIN_HOME_PATH);
  if (state.kind === "onboarding") redirect(ONBOARDING_PATH);
  // Fiche supprimée : la page de connexion affiche l'écran correspondant.
  redirect(COMPANY_LOGIN_PATH);
}

/** Administrateur de la session, ou `null` (droits vérifiés en base). */
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const state = await getAccountState();
  return state.kind === "admin" ? state.admin : null;
});

/** Admin ou dirigeant : ces comptes n'ont jamais accès à l'espace entreprise. */
export async function requireAdmin(): Promise<Admin> {
  const state = await getAccountState();
  if (state.kind === "admin") return state.admin;
  redirect(ADMIN_LOGIN_PATH);
}

/**
 * Garde d'un module administratif. Une session valide mais sans permission est
 * envoyée vers un écran dédié, jamais vers une page qu'elle ne peut pas voir.
 */
export async function requireAdminPermission(
  module: AdminModule,
  level: AdminPermissionLevel = "read",
): Promise<Admin> {
  const admin = await requireAdmin();
  if (!hasAdminPermission(admin.permissions, module, level)) {
    redirect(ADMIN_ACCESS_DENIED_PATH);
  }
  return admin;
}
