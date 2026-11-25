import type { AdminRole } from "@/server/domain";

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  if (role === "dirigeant") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-black/20 bg-white px-2.5 py-1 text-xs font-semibold text-black">
        <span className="size-1.5 rounded-full bg-black" />
        Dirigeant AvisTrack
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-black/15 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
      <span className="size-1.5 rounded-full bg-accent" />
      Administrateur
    </span>
  );
}
