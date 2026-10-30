import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { viewSubscription } from "@/lib/subscription";
import type { CompanySubscription } from "@/server/domain";

export function SubscriptionSummary({
  subscription,
  now,
}: {
  subscription: CompanySubscription;
  now: Date;
}) {
  const view = viewSubscription(subscription, now);
  const alert = view.isExpired
    ? "Votre abonnement a expiré. Renouvelez pour retrouver l'accès complet."
    : view.isEndingSoon
      ? `Votre essai se termine dans ${view.daysRemaining} jour${view.daysRemaining === 1 ? "" : "s"}.`
      : null;

  return (
    <section
      aria-label="Résumé de l'abonnement"
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        view.isExpired
          ? "border-red bg-red/5"
          : view.isEndingSoon
            ? "border-orange bg-orange/5"
            : "border-black/10 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{view.modeLabel}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {view.statusLabel}
        </span>
        <span className="text-sm text-gray-600">
          {subscription.amount > 0
            ? formatCurrency(subscription.amount)
            : "Gratuit"}
          {view.endDate ? ` · échéance ${formatDate(view.endDate)}` : ""}
        </span>
        {alert ? <span className="text-sm text-red">{alert}</span> : null}
      </div>
      <Link
        href="/dashboard/abonnement"
        className={buttonClass(view.isExpired ? "primary" : "secondary", "", "sm")}
      >
        {view.isExpired ? "Renouveler" : "Gérer mon abonnement"}
      </Link>
    </section>
  );
}
