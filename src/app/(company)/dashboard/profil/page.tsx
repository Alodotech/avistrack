import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader, Panel } from "@/components/ui/panel";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { defaultTrialSubscription, viewSubscription } from "@/lib/subscription";
import { requireCompany } from "@/server/auth/guards";
import { signOutCompany } from "@/server/auth/sign-out";
import {
  getCompanySubscription,
  listPayments,
} from "@/server/repositories/subscription-repository";
import { DeleteAccountPanel } from "@/components/company/delete-account-panel";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profil"
        description="Votre identité, votre abonnement et les informations de votre compte."
      />
      <Suspense
        fallback={<p className="text-sm text-gray-600">Chargement du profil…</p>}
      >
        <ProfileContent />
      </Suspense>
    </>
  );
}

async function ProfileContent() {
  // Le profil reste accessible même abonnement expiré (mise à jour des infos).
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
  const lastPayment = payments[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel id="identite" title="Identité">
        <ProfileForm
          key={`${company.name}-${company.phone}-${company.logoUrl ?? ""}`}
          email={company.email}
          phone={company.phone}
          name={company.name}
          logoUrl={company.logoUrl}
        />
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel
          id="abonnement"
          title="Abonnement"
          actions={
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${
                view.isExpired
                  ? "border-red bg-red text-white"
                  : view.isEndingSoon
                    ? "border-orange bg-orange/10 text-orange"
                    : "border-forest bg-forest/10 text-forest"
              }`}
            >
              {view.statusLabel}
            </span>
          }
        >
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Offre</dt>
              <dd className="font-semibold">{view.modeLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Montant</dt>
              <dd className="font-semibold tabular-nums">
                {formatCurrency(subscription.amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Prochaine échéance</dt>
              <dd className="font-semibold">
                {view.endDate ? formatDate(view.endDate) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Dernier paiement</dt>
              <dd className="font-semibold">
                {lastPayment
                  ? `${formatCurrency(lastPayment.amount)} · ${formatDate(lastPayment.createdAt)}`
                  : "—"}
              </dd>
            </div>
          </dl>
          <Link
            href="/dashboard/abonnement"
            className={buttonClass("secondary", "mt-5 w-full", "sm")}
          >
            Gérer mon abonnement
          </Link>
        </Panel>

        <Panel id="compte" title="Compte">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">E-mail</dt>
              <dd className="truncate font-semibold">{company.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Connexion</dt>
              <dd className="font-semibold">Google</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600">Entreprise créée le</dt>
              <dd className="font-semibold">{formatDate(company.createdAt)}</dd>
            </div>
          </dl>
          <form action={signOutCompany} className="mt-5">
            <button
              type="submit"
              className="text-sm font-semibold text-red underline underline-offset-4"
            >
              Se déconnecter
            </button>
          </form>
        </Panel>

        <DeleteAccountPanel companyName={company.name} />
      </div>
    </div>
  );
}
