"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SubscriptionEditModal } from "@/components/admin/subscription-edit-modal";
import {
  ClockIcon,
  CreditCardIcon,
  RefreshIcon,
  SearchIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { tableStyles as t } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { AVIS_TRACK_PRICING, getSubscriptionPrice } from "@/lib/pricing";
import type {
  CompanyStatus,
  SerializedSubscription,
  SubscriptionPeriod,
} from "@/server/domain";

export type FinancialCompanyItem = {
  id: string;
  name: string;
  email: string;
  status: CompanyStatus;
  createdAt: Date;
};

type Props = {
  companies: FinancialCompanyItem[];
  totalCompaniesCount: number;
  subscriptions?: Record<string, SerializedSubscription>;
};

export function FinancialOverview({
  companies,
  subscriptions = {},
}: Props) {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "annual" | "monthly" | "trial">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCompany, setEditingCompany] = useState<{
    company: FinancialCompanyItem;
    period: SubscriptionPeriod;
  } | null>(null);

  // Construction de la liste des entreprises avec leur formule d'abonnement
  const companySubscriptions = useMemo(() => {
    return companies.map((c) => {
      const sub = subscriptions[c.id];
      const trialEndDate = new Date(c.createdAt);
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const period: SubscriptionPeriod = sub?.period || "trial";
      const amount = sub?.amount ?? getSubscriptionPrice(period);
      const isSuspended = c.status === "SUSPENDED";

      return {
        company: c,
        period,
        amount,
        isSuspended,
        trialEndDate,
        updatedAt: sub?.updatedAt ? new Date(sub.updatedAt) : null,
      };
    });
  }, [companies, subscriptions]);

  // Métriques financières calculées
  const stats = useMemo(() => {
    let mrr = 0;
    let annualCount = 0;
    let monthlyCount = 0;
    let trialCount = 0;

    for (const item of companySubscriptions) {
      if (item.isSuspended) continue;

      if (item.period === "annual") {
        annualCount++;
        mrr += Math.round(item.amount / 12);
      } else if (item.period === "monthly") {
        monthlyCount++;
        mrr += item.amount;
      } else {
        trialCount++;
      }
    }

    const arr = mrr * 12;
    const paidCount = annualCount + monthlyCount;
    const averageOrder = paidCount > 0 ? Math.round(mrr / paidCount) : 0;

    return {
      mrr,
      arr,
      annualCount,
      monthlyCount,
      trialCount,
      paidCount,
      averageOrder,
    };
  }, [companySubscriptions]);

  // Filtrage par période et recherche textuelle
  const filteredSubscriptions = useMemo(() => {
    return companySubscriptions.filter((sub) => {
      if (filterPeriod === "annual" && sub.period !== "annual") return false;
      if (filterPeriod === "monthly" && sub.period !== "monthly") return false;
      if (filterPeriod === "trial" && sub.period !== "trial") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = sub.company.name.toLowerCase().includes(query);
        const matchesEmail = sub.company.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      return true;
    });
  }, [companySubscriptions, filterPeriod, searchQuery]);

  return (
    <>
      <Panel
        id="finances"
        title="Surveillance financière des abonnements"
        description="Suivi du chiffre d'affaires, distinction claire des abonnements annuels & mensuels, et gestion des souscriptions en FCFA."
        flush
      >
        <div className="flex flex-col gap-6 p-5 sm:p-6">
          {/* KPI financiers en FCFA */}
          <div className="grid grid-cols-2 gap-3 min-[760px]:grid-cols-4 min-[760px]:gap-4">
            {/* MRR */}
            <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-gray-50/70 p-4">
              <span className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider">
                MRR (Revenu Mensuel)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                  {formatCurrency(stats.mrr)}
                </span>
              </div>
              <span className="text-[0.7rem] text-gray-400">Total récurrent / mois</span>
            </div>

            {/* ARR */}
            <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-gray-50/70 p-4">
              <span className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider">
                ARR (Revenu Annuel)
              </span>
              <span className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                {formatCurrency(stats.arr)}
              </span>
              <span className="text-[0.7rem] text-gray-400">Projection annuelle (MRR × 12)</span>
            </div>

            {/* Abonnements Actifs & Répartition Annuel/Mensuel */}
            <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-gray-50/70 p-4">
              <span className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider">
                Abonnements Payants
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                  {stats.paidCount}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  client{stats.paidCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-purple-800">
                  <ZapIcon className="size-3 text-purple-700" />
                  {stats.annualCount} annuel{stats.annualCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-sky-800">
                  <RefreshIcon className="size-3 text-sky-700" />
                  {stats.monthlyCount} mensuel{stats.monthlyCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Périodes d'essai gratuites */}
            <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-gray-50/70 p-4">
              <span className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-wider">
                En Période d&apos;Essai (14j)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
                  {stats.trialCount}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {stats.trialCount > 1 ? "entreprises" : "entreprise"}
                </span>
              </div>
              <span className="text-[0.7rem] text-gray-400">14 jours offerts à l&apos;inscription</span>
            </div>
          </div>



          {/* Grille tarifaire unique AvisTrack en FCFA */}
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                <CreditCardIcon className="size-4 text-accent" />
                Grille tarifaire de l&apos;Abonnement AvisTrack (en FCFA)
              </h3>
              <span className="text-[0.75rem] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                Toutes les entreprises profitent des mêmes fonctionnalités complètes
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Option 1 : Essai gratuit */}
              <div className="rounded-xl border border-black/10 bg-gray-50/50 p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black flex items-center gap-1.5">
                    <ClockIcon className="size-4 text-amber-600" />
                    Essai Découverte
                  </span>
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                    14 jours offerts
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-500">
                  Accès complet dès l&apos;inscription pour tester et collecter les premiers avis.
                </p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-black">0 FCFA</span>
                  <span className="text-[0.65rem] text-gray-400 block">Sans carte bancaire ni engagement</span>
                </div>
              </div>

              {/* Option 2 : Formule Mensuelle */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <RefreshIcon className="size-4 text-sky-600" />
                    Abonnement Mensuel
                  </span>
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-sky-800">
                    Sans engagement
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-600">
                  Facturation mois par mois. Idéal pour démarrer avec souplesse.
                </p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-sky-950">
                    {formatCurrency(AVIS_TRACK_PRICING.monthly)}{" "}
                    <span className="text-[0.65rem] font-normal text-gray-500">/ mois</span>
                  </span>
                  <span className="text-[0.65rem] text-gray-500 block">Renouvelable chaque mois</span>
                </div>
              </div>

              {/* Option 3 : Formule Annuelle */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 flex flex-col gap-1.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-[0.55rem] font-bold text-white px-2 py-0.5 rounded-bl">
                  2 mois offerts !
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <ZapIcon className="size-4 text-purple-600" />
                    Abonnement Annuel
                  </span>
                  <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-purple-900 mr-16">
                    Économique
                  </span>
                </div>
                <p className="text-[0.7rem] text-gray-600">
                  Règlement en une fois par an avec 2 mois offerts.
                </p>
                <div className="mt-1">
                  <span className="text-sm font-bold text-purple-950">
                    {formatCurrency(AVIS_TRACK_PRICING.annual)}{" "}
                    <span className="text-[0.65rem] font-normal text-gray-500">/ an</span>
                  </span>
                  <span className="text-[0.65rem] text-emerald-700 font-medium block">
                    Économisez {formatCurrency(AVIS_TRACK_PRICING.monthly * 2)} par an
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barre d'outils : Filtres par Périodicité (Annuel / Mensuel / Essai) et Recherche */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Onglets de filtrage rapide */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterPeriod("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterPeriod === "all"
                    ? "bg-white text-black shadow-xs"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Tous ({companySubscriptions.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterPeriod("annual")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterPeriod === "annual"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-purple-700"
                }`}
              >
                <ZapIcon className="size-3.5" />
                <span>Annuel</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.65rem] ${
                    filterPeriod === "annual"
                      ? "bg-white/20 text-white"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {stats.annualCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterPeriod("monthly")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterPeriod === "monthly"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-sky-700"
                }`}
              >
                <RefreshIcon className="size-3.5" />
                <span>Mensuel</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.65rem] ${
                    filterPeriod === "monthly"
                      ? "bg-white/20 text-white"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {stats.monthlyCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterPeriod("trial")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterPeriod === "trial"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-amber-800"
                }`}
              >
                <ClockIcon className="size-3.5" />
                <span>Essai 14j</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.65rem] ${
                    filterPeriod === "trial"
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {stats.trialCount}
                </span>
              </button>
            </div>

            {/* Champ de recherche */}
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-1.5 text-xs text-black placeholder:text-gray-400 focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tableau détaillé des abonnements */}
        <div className={t.wrapper}>
          <table className={t.table}>
            <thead className={t.head}>
              <tr>
                <th scope="col" className={t.th}>
                  Entreprise
                </th>
                <th scope="col" className={t.th}>
                  Abonnement
                </th>
                <th scope="col" className={t.th}>
                  Périodicité (Annuel / Mensuel)
                </th>
                <th scope="col" className={t.th}>
                  Montant facturé
                </th>
                <th scope="col" className={t.th}>
                  Statut & Échéance
                </th>
                <th scope="col" className={`${t.th} text-right`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-gray-500">
                    Aucune entreprise ne correspond au filtre sélectionné.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.company.id} className={t.row}>
                    {/* 1. Entreprise */}
                    <td className={t.td}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-black">
                          {sub.company.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {sub.company.email}
                        </span>
                        <span className="text-[0.65rem] text-gray-400 mt-0.5">
                          Inscrit le {formatDate(sub.company.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* 2. Abonnement */}
                    <td className={t.td}>
                      <span className="inline-flex items-center rounded-lg border border-black/10 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-800">
                        AvisTrack
                      </span>
                    </td>

                    {/* 3. Périodicité */}
                    <td className={t.td}>
                      {sub.period === "annual" ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800 shadow-2xs">
                            <ZapIcon className="size-3.5 text-purple-700" />
                            Annuel (12 mois)
                          </span>
                          <span className="text-[0.65rem] font-semibold text-emerald-700">
                            Facturé par an · 2 mois offerts
                          </span>
                        </div>
                      ) : sub.period === "monthly" ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 shadow-2xs">
                            <RefreshIcon className="size-3.5 text-sky-600" />
                            Mensuel
                          </span>
                          <span className="text-[0.65rem] font-medium text-gray-500">
                            Facturé chaque mois
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs">
                            <ClockIcon className="size-3.5 text-amber-600" />
                            Essai gratuit
                          </span>
                          <span className="text-[0.65rem] font-medium text-gray-500">
                            14 jours d&apos;essai
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 4. Montant facturé en FCFA */}
                    <td className={t.td}>
                      <div className="flex flex-col">
                        <span className="font-bold text-black text-xs">
                          {formatCurrency(sub.amount)}
                        </span>
                        <span className="text-[0.65rem] text-gray-400">
                          {sub.period === "annual"
                            ? "par an"
                            : sub.period === "monthly"
                            ? "par mois"
                            : "sans engagement"}
                        </span>
                      </div>
                    </td>

                    {/* 5. Statut & Échéance */}
                    <td className={t.td}>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            sub.isSuspended
                              ? "text-red"
                              : sub.period === "trial"
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              sub.isSuspended
                                ? "bg-red"
                                : sub.period === "trial"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {sub.isSuspended
                            ? "Suspendu"
                            : sub.period === "trial"
                            ? "En cours d'essai"
                            : "Abonnement actif"}
                        </span>
                        <span className="text-[0.65rem] text-gray-500">
                          {sub.period === "trial"
                            ? `Fin d'essai : ${formatDate(sub.trialEndDate)}`
                            : `Renouvellement : ${formatDate(
                                sub.updatedAt
                                  ? new Date(
                                      sub.updatedAt.getTime() +
                                        (sub.period === "annual" ? 365 : 30) *
                                          86400000
                                    )
                                  : sub.trialEndDate
                              )}`}
                        </span>
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className={`${t.td} text-right`}>
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCompany({
                              company: sub.company,
                              period: sub.period,
                            })
                          }
                          className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-bold text-black hover:bg-gray-50 transition shadow-2xs"
                        >
                          Changer formule
                        </button>
                        <Link
                          href={`/admin/entreprises?recherche=${encodeURIComponent(
                            sub.company.name
                          )}`}
                          className="text-xs font-bold text-accent hover:underline"
                        >
                          Fiche →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal d'édition de l'abonnement */}
      {editingCompany && (
        <SubscriptionEditModal
          companyId={editingCompany.company.id}
          companyName={editingCompany.company.name}
          currentPeriod={editingCompany.period}
          isOpen={true}
          onClose={() => setEditingCompany(null)}
        />
      )}
    </>
  );
}
