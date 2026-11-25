"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";

/** Ligne d'entreprise affichée dans le tableau de bord Admin. */
export type RecentCompanyItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
};

export function RecentCompanies({ items }: { items: RecentCompanyItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-600">Aucune inscription pour le moment.</p>;
  }

  return (
    <ul className="divide-y divide-black/10">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.name}</p>
            <p className="truncate text-xs text-gray-600">{item.email}</p>
          </div>
          {/*
           * Formatage en UTC comme partout ailleurs dans l'application : le
           * fuseau du navigateur ne doit pas décaler la date d'inscription.
           */}
          <time
            dateTime={new Date(item.createdAt).toISOString()}
            className="shrink-0 text-xs text-gray-600 tabular-nums"
          >
            {formatDate(item.createdAt)}
          </time>
        </li>
      ))}
      <li className="pt-4">
        <Link
          href="/admin/entreprises"
          className="text-sm font-semibold text-black underline underline-offset-4 hover:text-accent"
        >
          Voir toutes les entreprises
        </Link>
      </li>
    </ul>
  );
}
