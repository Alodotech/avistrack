"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaymentHistoryItem } from "@/server/repositories/subscription-repository";
import type { SubscriptionView } from "@/lib/subscription";
import { cancelSubscriptionAction } from "@/server/actions/payments";

type Props = {
  view: SubscriptionView;
  period: "trial" | "monthly" | "annual";
  amount: number;
  startedAt: string;
  endDate: string | null;
  payments: PaymentHistoryItem[];
};

export function SubscriptionManager({
  view,
  period,
  amount,
  startedAt,
  endDate,
  payments,
}: Props) {
  const router = useRouter();
  const [cancelPending, startCancel] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPaid = period === "monthly" || period === "annual";
  const canCancel = isPaid && view.status !== "CANCELED" && view.status !== "EXPIRED";

  function cancel() {
    if (
      !window.confirm(
        "Résilier votre abonnement ? L'accès reste ouvert jusqu'à la fin de la période payée.",
      )
    ) {
      return;
    }
    startCancel(async () => {
      const result = await cancelSubscriptionAction();
      if (!result.ok) {
        setError(result.message ?? "La résiliation a échoué.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {canCancel ? (
            <Button
              type="button"
              variant="secondary"
              disabled={cancelPending}
              onClick={cancel}
            >
              {cancelPending ? "Résiliation…" : "Résilier"}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red">{error}</p>
        ) : null}

        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-600">Forfait</dt>
            <dd className="font-semibold">{view.modeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Montant</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Début</dt>
            <dd className="font-semibold">{formatDate(startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Prochaine échéance</dt>
            <dd className="font-semibold">
              {endDate ? formatDate(endDate) : "—"}
              {view.daysRemaining !== null ? (
                <span className="ml-1 text-xs font-normal text-gray-600">
                  ({view.daysRemaining} j)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-semibold">Historique des paiements</h3>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              Aucun paiement enregistré pour le moment.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Offre</th>
                    <th className="py-2 pr-4">Montant</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2">Reçu</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-black/10">
                      <td className="py-2 pr-4">{formatDate(payment.createdAt)}</td>
                      <td className="py-2 pr-4">
                        {payment.period === "annual" ? "Pro annuel" : "Pro mensuel"}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-2 pr-4">Payé</td>
                      <td className="py-2">
                        <a
                          className="font-semibold text-accent underline underline-offset-4"
                          href={`/api/company/paiements/${payment.id}/recu`}
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
