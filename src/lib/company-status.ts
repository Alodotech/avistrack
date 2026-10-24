import type { CompanyStatus } from "@/server/domain";

export type StatusChange = "SUSPEND" | "REACTIVATE";

/**
 * Transitions autorisées (RG-04, RG-05). Un compte en attente de vérification
 * e-mail ne peut pas être « réactivé » : cela contournerait la vérification.
 * Retourne `null` si la transition est refusée.
 */
export function nextStatus(
  current: CompanyStatus,
  change: StatusChange,
): CompanyStatus | null {
  if (change === "SUSPEND" && current === "ACTIVE") return "SUSPENDED";
  if (change === "REACTIVATE" && current === "SUSPENDED") return "ACTIVE";
  return null;
}

export const STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  PENDING: "En attente",
};
