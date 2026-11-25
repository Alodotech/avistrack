"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SerializedSubscription, SubscriptionPeriod } from "@/server/domain";

type Props = {
  companyId: string;
  name: string;
  createdAt: string | Date;
  subscription?: SerializedSubscription;
};

export function ViewSubscriptionModal({
  name,
  subscription,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const hasSubscription = Boolean(
    subscription &&
      (subscription.period !== "trial" || subscription.adminGrantedTrial),
  );
  const period: SubscriptionPeriod = subscription?.period ?? "trial";
  const amount = hasSubscription ? subscription?.amount ?? 0 : 0;

  const startDate = hasSubscription && subscription
    ? new Date(subscription.startedAt)
    : null;
  const endDate = hasSubscription && subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : hasSubscription && subscription?.trialEndDate
      ? new Date(subscription.trialEndDate)
      : null;

  const now = new Date();
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  const planLabel = !hasSubscription
    ? "Aucune formule attribuée"
    : period === "annual"
      ? "Formule Annuelle (12 mois)"
      : period === "monthly"
        ? "Formule Mensuelle"
        : "Période d'essai gratuit (14 jours)";

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        title={`Vérifier l'abonnement de ${name}`}
        aria-label={`Vérifier l'abonnement de ${name}`}
        className="inline-flex size-11 items-center justify-center rounded-lg border border-black/15 bg-white text-black hover:border-black/40 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        <CreditCardIcon className="size-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-md border border-black/20 bg-white p-6 text-left text-black backdrop:bg-black/60 shadow-lg"
      >
        <div className="flex flex-col gap-5">
          {/* Entête */}
          <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gray-100 text-black">
                  <CreditCardIcon className="size-5" />
                </span>
                <h2 className="text-lg font-bold text-black wrap-break-word">
                  Abonnement — {name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Informations de souscription et dates de validité
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fermer"
              className="flex size-11 items-center justify-center rounded-md text-gray-500 hover:bg-black/5 hover:text-black transition-colors"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Statut de validité en bannière */}
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
              isExpired
                ? "border border-red/30 bg-red/5 text-red"
                : "border border-black/10 bg-gray-50 text-black"
            }`}
          >
            {isExpired ? (
              <ClockIcon className="size-5 shrink-0 text-red" />
            ) : (
              <CheckIcon className="size-5 shrink-0 text-black" />
            )}
            <div>
              {!hasSubscription ? (
                <span>Aucun abonnement n&apos;a été attribué à cette entreprise.</span>
              ) : isExpired ? (
                <span>
                  Abonnement arrivé à échéance depuis{" "}
                  <strong>
                    {Math.abs(daysRemaining ?? 0)} jour
                    {Math.abs(daysRemaining ?? 0) > 1 ? "s" : ""}
                  </strong>
                  .
                </span>
              ) : daysRemaining !== null ? (
                <span>
                  Abonnement actif · Il reste{" "}
                  <strong>
                    {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                  </strong>{" "}
                  de validité.
                </span>
              ) : (
                <span>Abonnement actif, sans échéance enregistrée.</span>
              )}
            </div>
          </div>

          {/* Grille des 2 dates clés : Jour de l'abonnement & Jour de la fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Jour de l'abonnement */}
            <div className="flex flex-col gap-1 rounded-lg border border-black/10 bg-gray-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <CalendarIcon className="size-4 text-gray-600" />
                Jour de l&apos;abonnement
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-black">
                {startDate ? formatDate(startDate) : "—"}
              </div>
              <span className="text-xs text-gray-500">
                Date de début / souscription
              </span>
            </div>

            {/* 2. Jour de la fin */}
            <div className="flex flex-col gap-1 rounded-lg border border-black/10 bg-gray-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <ClockIcon className="size-4 text-gray-600" />
                Jour de la fin
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-black">
                {endDate ? formatDate(endDate) : "—"}
              </div>
              <span className="text-xs text-gray-500">
                Date d&apos;échéance / renouvellement
              </span>
            </div>
          </div>

          {/* Formule et montant */}
          <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3.5 bg-white">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Formule souscrite
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Montant
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900">{planLabel}</span>
              <span className="font-bold text-gray-900 tabular-nums text-base">
                {formatCurrency(amount)}
                {period === "annual" ? " / an" : period === "monthly" ? " / mois" : ""}
              </span>
            </div>
            {subscription?.adminEmail ? (
              <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5 border-t border-black/5 pt-2">
                <InfoIcon className="size-3.5 text-gray-500" />
                Dernière modification par {subscription.adminEmail}
              </p>
            ) : null}
          </div>

          {/* Actions pied de boîte */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/10">
            <Link
              href={`/admin/finances?q=${encodeURIComponent(name)}`}
              className={buttonClass("ghost", "text-sm text-black hover:text-gray-600")}
              onClick={() => dialogRef.current?.close()}
            >
              Gérer dans Finances →
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Fermer
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
