import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Admin, Company } from "@/server/domain";
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
export const ONBOARDING_PATH = "/?auth=signup";
export const COMPANY_HOME_PATH = "/dashboard";
export const ADMIN_HOME_PATH = "/admin";

/** Entreprise de la session, ou `null` (pas de session, compte supprimé). */
export const getCurrentCompany = cache(async (): Promise<Company | null> => {
  const state = await getAccountState();
  return state.kind === "company" ? state.company : null;
});

/**
 * Pour les pages : redirige vers la destination adaptée à l'état du compte.
 */
export async function requireCompany(): Promise<Company> {
  const state = await getAccountState();
  if (state.kind === "company") return state.company;
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

export async function requireAdmin(): Promise<Admin> {
  const state = await getAccountState();
  if (state.kind === "admin") return state.admin;
  redirect(ADMIN_LOGIN_PATH);
}
