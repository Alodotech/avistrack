"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRemarkAction } from "@/app/(company)/dashboard/remarques/actions";
import { formatDate } from "@/lib/format";

export type RemarkItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  message: string;
  /** Date ISO sérialisée depuis le serveur. */
  createdAt: string;
};

function author(item: RemarkItem): string {
  const name = [item.firstName, item.lastName].filter(Boolean).join(" ").trim();
  if (!name) return "Anonyme";
  return item.phone ? `${name} · ${item.phone}` : name;
}

/** Liste des remarques reçues : lecture, auteur, suppression avec confirmation. */
export function RemarksList({ remarks }: { remarks: RemarkItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(item: RemarkItem) {
    if (
      !window.confirm(
        "Supprimer définitivement cette remarque ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(item.id);
    startTransition(async () => {
      const result = await deleteRemarkAction(item.id);
      setPendingId(null);
      if (!result.ok) {
        setError(result.message ?? "La suppression a échoué.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col">
      {error ? (
        <p role="alert" className="border-b border-black/10 bg-red/5 px-5 py-3 text-sm text-red">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-black/10">
        {remarks.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 px-5 py-4 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-black">
                  {author(item)}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => remove(item)}
                className="cursor-pointer rounded-lg border border-red/20 bg-red/5 px-2.5 py-1 text-xs font-semibold text-red transition-colors hover:bg-red/10 disabled:opacity-50"
                aria-label="Supprimer cette remarque"
              >
                {pendingId === item.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
            <p className="text-sm leading-6 whitespace-pre-line text-gray-800">
              {item.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
