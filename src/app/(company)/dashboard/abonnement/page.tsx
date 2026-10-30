import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubscriptionManager } from "@/components/billing/subscription-manager";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { defaultTrialSubscription, viewSubscription } from "@/lib/subscription";
import { requireCompany } from "@/server/auth/guards";
import {
  getCompanySubscription,
  listPayments,
} from "@/server/repositories/subscription-repository";

export const metadata: Metadata = { title: "Abonnement" };

export default function SubscriptionPage() {
  return (
    <>
      <PageHeader
        title="Mon abonnement"
        description="Votre forfait, vos échéances et l'historique de vos paiements."
      />
      <Suspense fallback={<p className="text-sm text-gray-600">Chargement de l&apos;abonnement…</p>}>
        <SubscriptionContent />
      </Suspense>
    </>
  );
}

async function SubscriptionContent() {
  // Page de secours d'un abonnement expiré : elle reste toujours accessible.
  const company = await requireCompany({ allowExpired: true });
  await connection();
  const [stored, payments] = await Promise.all([
    getCompanySubscription(company.id),
    listPayments(company.id),
  ]);
  const now = new Date();
  const subscription =
    stored ?? defaultTrialSubscription(company.id, company.createdAt, now);
  const view = viewSubscription(subscription, now);

  return (
    <div className="flex flex-col gap-6">
      <Panel
        id="offre"
        title="Votre offre"
        description={`Statut : ${view.statusLabel}`}
        actions={
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${
              view.isExpired
                ? "border-red bg-red text-white"
                : view.isEndingSoon
                  ? "border-orange bg-orange/10 text-orange"
                  : view.status === "ACTIVE"
                    ? "border-forest bg-forest/10 text-forest"
                    : "border-gray-600 bg-gray-100 text-gray-600"
            }`}
          >
            {view.statusLabel}
          </span>
        }
      >
        <SubscriptionManager
          view={view}
          period={subscription.period}
          amount={subscription.amount}
          startedAt={subscription.startedAt.toISOString()}
          endDate={view.endDate?.toISOString() ?? null}
          payments={payments}
        />
      </Panel>

      <Panel id="aide" title="Besoin d'aide ?">
        <p className="text-sm text-gray-600">
          {subscription.trialEndDate ? (
            <> Votre essai se termine le {formatDate(subscription.trialEndDate)}.</>
          ) : null}
        </p>
      </Panel>
    </div>
  );
}
