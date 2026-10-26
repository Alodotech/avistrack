import type { AdminRole } from "@/server/domain";

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  if (role === "dirigeant") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Dirigeant AvisTrack
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
      <span className="size-1.5 rounded-full bg-accent" />
      Administrateur
    </span>
  );
}
