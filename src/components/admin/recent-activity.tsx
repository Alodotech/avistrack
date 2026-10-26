import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { AuditAction } from "@/server/domain";
import type { AuditLogRowView } from "@/server/repositories/audit-log-repository";

const ACTION_LABELS: Record<AuditAction, string> = {
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  DELETE: "Suppression",
  INVITE_ADMIN: "Ajout utilisateur",
  UPDATE_ADMIN_ROLE: "Changement rôle",
  REMOVE_ADMIN: "Retrait utilisateur",
  UPDATE_SUBSCRIPTION: "Mise à jour abonnement",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(date);
}

export function RecentActivity({ entries }: { entries: AuditLogRowView[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Aucune action enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-black/10">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {ACTION_LABELS[entry.action]} — {entry.companyName ?? "Entreprise"}
            </p>
            <p className="text-xs text-gray-600">
              {entry.adminEmail}
              {entry.reason ? ` · ${entry.reason}` : ""}
            </p>
          </div>
          <time
            dateTime={entry.createdAt.toISOString()}
            className="shrink-0 text-xs text-gray-600 tabular-nums"
          >
            {timeAgo(entry.createdAt)}
          </time>
        </li>
      ))}
      <li className="pt-4">
        <Link
          href="/admin/journal"
          className="text-sm font-semibold text-black underline underline-offset-4 hover:text-accent"
        >
          Voir tout le journal d&apos;audit
        </Link>
      </li>
    </ul>
  );
}
