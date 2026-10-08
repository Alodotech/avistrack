import "server-only";
import { cookies } from "next/headers";

/**
 * Contrat de session consommé par les dashboards.
 *
 * L'implémentation ci-dessous est un BOUCHON de développement : elle lit un
 * identifiant dans un cookie non signé, posé par la page `/dev/session`. Elle
 * est inerte en production (aucune session => redirection vers la connexion).
 *
 * À remplacer par Auth.js (session JWT signée, cookie httpOnly/Secure/
 * SameSite=Lax) en conservant ces deux signatures : entreprise et admin
 * restent deux sessions distinctes (AU-07).
 */

export type CompanySession = { companyId: string };
export type AdminSession = { adminId: string };

export const DEV_COMPANY_COOKIE = "avistrack_dev_company";
export const DEV_ADMIN_COOKIE = "avistrack_dev_admin";

const isDevAuthEnabled = process.env.NODE_ENV !== "production";

async function readDevCookie(name: string): Promise<string | null> {
  if (!isDevAuthEnabled) return null;
  return (await cookies()).get(name)?.value || null;
}

export async function getCompanySession(): Promise<CompanySession | null> {
  const companyId = await readDevCookie(DEV_COMPANY_COOKIE);
  return companyId ? { companyId } : null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const adminId = await readDevCookie(DEV_ADMIN_COOKIE);
  return adminId ? { adminId } : null;
}
