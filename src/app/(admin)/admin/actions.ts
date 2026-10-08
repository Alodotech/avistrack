"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_LOGIN_PATH, getCurrentAdmin } from "@/server/auth/guards";
import type { Admin } from "@/server/domain";
import { recordAdminAction } from "@/server/repositories/audit-log-repository";
import {
  changeCompanyStatus,
  findCompanyById,
  softDeleteCompany,
} from "@/server/repositories/company-repository";

export type AdminActionState = {
  status: "idle" | "done" | "error";
  message?: string;
};

const NOT_FOUND: AdminActionState = {
  status: "error",
  message: "Entreprise introuvable : elle a peut-être déjà été supprimée.",
};

/**
 * Une Server Action est joignable par un POST direct : chacune revérifie la
 * session ADMIN. Une session entreprise ne donne aucun droit ici (AU-07).
 */
async function authorizeAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  return admin;
}

const statusSchema = z.object({
  companyId: z.uuid(),
  change: z.enum(["SUSPEND", "REACTIVATE"]),
});

/** AD-03 : suspendre ou réactiver une entreprise. */
export async function changeCompanyStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await authorizeAdmin();

  const parsed = statusSchema.safeParse({
    companyId: formData.get("companyId"),
    change: formData.get("change"),
  });
  if (!parsed.success) return { status: "error", message: "Requête invalide." };

  const result = await changeCompanyStatus(
    parsed.data.companyId,
    parsed.data.change,
  );
  if (!result.ok) {
    return result.reason === "NOT_FOUND"
      ? NOT_FOUND
      : {
          status: "error",
          message: "Ce changement de statut n'est pas possible pour ce compte.",
        };
  }

  await recordAdminAction({
    adminId: admin.id,
    action: parsed.data.change,
    targetCompanyId: result.company.id,
    companyName: result.company.name,
  });
  refresh();
  return { status: "done" };
}

const deleteSchema = z.object({
  companyId: z.uuid(),
  confirmation: z.string(),
});

/** AD-04 : suppression logique, après saisie du nom exact de l'entreprise. */
export async function deleteCompanyAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await authorizeAdmin();

  const parsed = deleteSchema.safeParse({
    companyId: formData.get("companyId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { status: "error", message: "Requête invalide." };

  const company = await findCompanyById(parsed.data.companyId);
  if (!company) return NOT_FOUND;
  if (parsed.data.confirmation.trim() !== company.name) {
    return {
      status: "error",
      message: "Le nom saisi ne correspond pas à celui de l'entreprise.",
    };
  }

  const result = await softDeleteCompany(company.id);
  if (!result.ok) return NOT_FOUND;

  await recordAdminAction({
    adminId: admin.id,
    action: "DELETE",
    targetCompanyId: company.id,
    companyName: company.name,
  });
  refresh();
  return { status: "done" };
}
