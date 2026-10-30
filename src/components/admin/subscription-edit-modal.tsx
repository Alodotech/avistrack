"use client";

import { useState, useTransition } from "react";
import { updateSubscriptionAction } from "@/app/(admin)/admin/finances/actions";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon, ClockIcon, CreditCardIcon, RefreshIcon, XIcon, ZapIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";
import {
  AVIS_TRACK_ANNUAL_SAVINGS,
  AVIS_TRACK_PRICING,
} from "@/lib/pricing";
import type { SubscriptionPeriod } from "@/server/domain";

type Props = {
  companyId: string;
  companyName: string;
  currentPeriod: SubscriptionPeriod;
  isOpen: boolean;
  onClose: () => void;
};

export function SubscriptionEditModal({
  companyId,
  companyName,
  currentPeriod,
  isOpen,
  onClose,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>(currentPeriod);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrice = AVIS_TRACK_PRICING[selectedPeriod];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("companyId", companyId);
      fd.append("companyName", companyName);
      fd.append("period", selectedPeriod);
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await updateSubscriptionAction(fd);
      if (!res.success) {
        setErrorMsg(res.error ?? "Erreur lors de la mise à jour");
      } else {
        onClose();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <CreditCardIcon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Abonnement AvisTrack</h3>
              <p className="text-xs text-gray-500 font-medium truncate max-w-xs">{companyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black transition"
            aria-label="Fermer"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red/20 bg-red/10 p-3 text-xs font-semibold text-red">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
          {/* Sélection de la formule d'abonnement */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Choisir la formule de l&apos;entreprise
            </label>
            <div className="flex flex-col gap-2">
              {/* 1. Essai gratuit (14 jours) */}
              <button
                type="button"
                onClick={() => setSelectedPeriod("trial")}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  selectedPeriod === "trial"
                    ? "border-amber-600 bg-amber-50/50 text-amber-950 ring-2 ring-amber-600/20"
                    : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <ClockIcon className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-black">Période d&apos;essai gratuit (14 jours)</span>
                    <span className="text-[0.65rem] text-gray-500">Offert à l&apos;inscription, sans engagement</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-black">0 FCFA</span>
                  {selectedPeriod === "trial" && <CheckIcon className="size-4 text-amber-600" />}
                </div>
              </button>

              {/* 2. Abonnement Mensuel */}
              <button
                type="button"
                onClick={() => setSelectedPeriod("monthly")}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  selectedPeriod === "monthly"
                    ? "border-sky-600 bg-sky-50/50 text-sky-950 ring-2 ring-sky-600/20"
                    : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                    <RefreshIcon className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-black">Abonnement Mensuel</span>
                    <span className="text-[0.65rem] text-gray-500">Facturé et renouvelé chaque mois</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-black">
                    {formatCurrency(AVIS_TRACK_PRICING.monthly)}
                    <span className="text-[0.65rem] font-normal text-gray-500"> / mois</span>
                  </span>
                  {selectedPeriod === "monthly" && <CheckIcon className="size-4 text-sky-600" />}
                </div>
              </button>

              {/* 3. Abonnement Annuel */}
              <button
                type="button"
                onClick={() => setSelectedPeriod("annual")}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition relative overflow-hidden ${
                  selectedPeriod === "annual"
                    ? "border-purple-600 bg-purple-50/50 text-purple-950 ring-2 ring-purple-600/20"
                    : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
                    <ZapIcon className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-black">Abonnement Annuel</span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[0.6rem] font-bold text-emerald-800">
                        Remise annuelle
                      </span>
                    </div>
                    <span className="text-[0.65rem] text-emerald-700 font-medium">
                      Économisez {formatCurrency(AVIS_TRACK_ANNUAL_SAVINGS)} par an
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-black">
                    {formatCurrency(AVIS_TRACK_PRICING.annual)}
                    <span className="text-[0.65rem] font-normal text-gray-500"> / an</span>
                  </span>
                  {selectedPeriod === "annual" && <CheckIcon className="size-4 text-purple-600" />}
                </div>
              </button>
            </div>
          </div>

          {/* Récapitulatif montant */}
          <div className="flex items-center justify-between rounded-xl bg-gray-100/80 px-4 py-3">
            <span className="text-xs font-medium text-gray-600">Montant de facturation :</span>
            <span className="text-sm font-black text-black">
              {formatCurrency(currentPrice)}{" "}
              <span className="text-xs font-normal text-gray-500">
                {selectedPeriod === "trial"
                  ? "(Essai 14 jours)"
                  : selectedPeriod === "annual"
                  ? "/ an"
                  : "/ mois"}
              </span>
            </span>
          </div>

          {/* Notes optionnelles */}
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-xs font-semibold text-gray-600">
              Note interne (facultatif)
            </label>
            <input
              id="notes"
              type="text"
              placeholder="Ex: Paiement Wave reçu, virement bancaire, chèque..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border border-black/15 px-3 py-2 text-xs text-black focus:border-accent focus:outline-none"
            />
          </div>

          {/* Boutons d'actions */}
          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={buttonClass("ghost")}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonClass("primary")}
            >
              {isPending ? "Enregistrement…" : "Valider l'abonnement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
