import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Admin, Company } from "@/server/domain";
import { findAdminById } from "@/server/repositories/admin-repository";
import { findCompanyById } from "@/server/repositories/company-repository";
import { getAdminSession, getCompanySession } from "./session";

/**
 * Gardes d'accès : unique endroit où l'identité est extraite de la session.
 * Tout `companyId` passé à un repository doit provenir de ces fonctions.
 */

export const COMPANY_LOGIN_PATH = "/login";
export const ADMIN_LOGIN_PATH = "/admin/login";

/** Entreprise de la session, ou `null` (pas de session, compte supprimé). */
export const getCurrentCompany = cache(async (): Promise<Company | null> => {
  const session = await getCompanySession();
  if (!session) return null;
  return findCompanyById(session.companyId);
});

/** Pour les pages : redirige vers la connexion faute de session valide. */
export async function requireCompany(): Promise<Company> {
  const company = await getCurrentCompany();
  if (!company) redirect(COMPANY_LOGIN_PATH);
  return company;
}

export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const session = await getAdminSession();
  if (!session) return null;
  return findAdminById(session.adminId);
});

export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  return admin;
}
