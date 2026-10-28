"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  EXPORT_MAX_ROWS,
  resolveDateRange,
  type CompanyFilters,
} from "@/lib/company-filters";
import { ADMIN_LOGIN_PATH, getCurrentAdmin } from "@/server/auth/guards";
import type { Admin } from "@/server/domain";
import { recordAdminAction } from "@/server/repositories/audit-log-repository";
import {
  changeCompanyStatus,
  findCompanyByIdAsAdmin,
  listCompaniesForAdmin,
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
  /** Date de suspension choisie par l'administrateur (optionnelle). */
  suspensionDate: z.string().optional(),
  /** Motif de la suspension : obligatoire, et consigné au journal d'audit. */
  reason: z
    .string()
    .trim()
    .min(5, "Le motif doit contenir au moins 5 caractères.")
    .max(500, "Le motif ne peut pas dépasser 500 caractères."),
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
    suspensionDate: formData.get("suspensionDate") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const reason = z.flattenError(parsed.error).fieldErrors.reason?.[0];
    return {
      status: "error",
      message: reason ?? "Requête invalide.",
    };
  }

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

  const dateNote = parsed.data.suspensionDate
    ? ` [Date d'effet : ${parsed.data.suspensionDate}]`
    : "";

  await recordAdminAction({
    adminId: admin.id,
    action: parsed.data.change,
    targetCompanyId: result.company.id,
    companyName: result.company.name,
    reason: `${parsed.data.reason}${dateNote}`,
  });
  refresh();
  return { status: "done" };
}

const deleteSchema = z.object({
  companyId: z.uuid(),
  confirmation: z.string(),
  reason: z
    .string()
    .trim()
    .min(5, "Le motif doit contenir au moins 5 caractères.")
    .max(500, "Le motif ne peut pas dépasser 500 caractères."),
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
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const reason = z.flattenError(parsed.error).fieldErrors.reason?.[0];
    return { status: "error", message: reason ?? "Requête invalide." };
  }

  // Lecture à privilèges administrateur : la fiche appartient à un autre compte.
  const company = await findCompanyByIdAsAdmin(parsed.data.companyId);
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
    reason: parsed.data.reason,
  });
  refresh();
  return { status: "done" };
}

/** Ligne transportée vers le navigateur pour les exports (T33, T34). */
export type ExportableCompany = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Date d'inscription au format ISO. */
  createdAt: string;
  reviewCount: number;
  averageRating: number | null;
  status: string;
};

/**
 * Renvoie toutes les entreprises correspondant aux filtres courants (et non
 * la seule page affichée) : un export porte toujours sur l'ensemble du
 * résultat filtré.
 */
export async function fetchCompaniesForExport(
  filters: CompanyFilters,
): Promise<ExportableCompany[]> {
  await authorizeAdmin();

  const range = resolveDateRange(filters, new Date());
  const page = await listCompaniesForAdmin({
    search: filters.search,
    status: filters.status,
    from: range.from,
    to: range.to,
    page: 1,
    pageSize: EXPORT_MAX_ROWS,
  });

  return page.items.map((company) => ({
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    createdAt: company.createdAt.toISOString(),
    reviewCount: company.reviewCount,
    averageRating: company.averageRating,
    status: company.status.toLowerCase(),
  }));
}
