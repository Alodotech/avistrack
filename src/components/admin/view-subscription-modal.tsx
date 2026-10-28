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
import { getSubscriptionPrice } from "@/lib/pricing";
import type { SerializedSubscription, SubscriptionPeriod } from "@/server/domain";

type Props = {
  companyId: string;
  name: string;
  createdAt: string | Date;
  subscription?: SerializedSubscription;
};

export function ViewSubscriptionModal({
  name,
  createdAt,
  subscription,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const period: SubscriptionPeriod = subscription?.period ?? "trial";
  const amount =
    subscription?.amount ??
    getSubscriptionPrice(period);

  // Jour de l'abonnement (Date de début de la formule courante)
  const startDate = subscription?.updatedAt
    ? new Date(subscription.updatedAt)
    : new Date(createdAt);

  // Jour de la fin (Date d'échéance ou de fin de validité)
  const endDate = new Date(startDate);
  if (period === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else if (period === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    // Essai gratuit 14 jours
    endDate.setDate(endDate.getDate() + 14);
  }

  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  const planLabel =
    period === "annual"
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
        className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <CreditCardIcon className="size-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-black/20 bg-white p-6 text-left text-black backdrop:bg-black/60 shadow-2xl"
      >
        <div className="flex flex-col gap-5">
          {/* Entête */}
          <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
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
              className="rounded-lg p-1 text-gray-500 hover:bg-black/5 hover:text-black transition-colors"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Statut de validité en bannière */}
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
              isExpired
                ? "border border-amber-300 bg-amber-50 text-amber-900"
                : "border border-green-200 bg-green-50 text-green-900"
            }`}
          >
            {isExpired ? (
              <ClockIcon className="size-5 shrink-0 text-amber-700" />
            ) : (
              <CheckIcon className="size-5 shrink-0 text-green-700" />
            )}
            <div>
              {isExpired ? (
                <span>
                  Abonnement arrivé à échéance depuis{" "}
                  <strong>
                    {Math.abs(daysRemaining)} jour
                    {Math.abs(daysRemaining) > 1 ? "s" : ""}
                  </strong>
                  .
                </span>
              ) : (
                <span>
                  Abonnement actif · Il reste{" "}
                  <strong>
                    {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                  </strong>{" "}
                  de validité.
                </span>
              )}
            </div>
          </div>

          {/* Grille des 2 dates clés : Jour de l'abonnement & Jour de la fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Jour de l'abonnement */}
            <div className="flex flex-col gap-1 rounded-lg border border-black/10 bg-gray-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <CalendarIcon className="size-4 text-blue-600" />
                Jour de l&apos;abonnement
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-black">
                {formatDate(startDate)}
              </div>
              <span className="text-xs text-gray-500">
                Date de début / souscription
              </span>
            </div>

            {/* 2. Jour de la fin */}
            <div className="flex flex-col gap-1 rounded-lg border border-black/10 bg-gray-50/70 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <ClockIcon className="size-4 text-purple-600" />
                Jour de la fin
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-black">
                {formatDate(endDate)}
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
                <InfoIcon className="size-3.5 text-gray-400" />
                Dernière modification par {subscription.adminEmail}
              </p>
            ) : null}
          </div>

          {/* Actions pied de boîte */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/10">
            <Link
              href={`/admin/finances?q=${encodeURIComponent(name)}`}
              className={buttonClass("ghost", "text-sm text-blue-700 hover:text-blue-900")}
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
