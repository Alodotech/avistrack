import { STATUS_LABELS } from "@/lib/company-status";
import type { CompanyStatus } from "@/server/domain";

/** Le statut est toujours écrit en toutes lettres : la couleur ne porte jamais seule l'information. */
const STYLES: Record<CompanyStatus, string> = {
  ACTIVE: "border-black bg-white text-black",
  SUSPENDED: "border-red bg-red text-white",
  PENDING: "border-gray-600 bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
