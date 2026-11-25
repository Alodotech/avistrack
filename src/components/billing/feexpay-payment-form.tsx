"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeexPayCheckoutButton } from "@/components/billing/feexpay-checkout-button";
import { Button } from "@/components/ui/button";
import {
  FEEXPAY_PAYMENT_METHODS,
  getFeexPayCountry,
  isFeexPayOperator,
  type FeexPayOperator,
  type FeexPayPaymentMethod,
} from "@/lib/feexpay";
import { formatCurrency } from "@/lib/format";
import { getSubscriptionPrice } from "@/lib/pricing";

type Props = {
  countryCode: string;
  companyPhone: string;
  canPay: boolean;
  testMode: boolean;
  initialPeriod?: "monthly" | "annual";
  verifyAfterPayment?: boolean;
  heading?: string;
  description?: string;
};

export function FeexPayPaymentForm({
  countryCode,
  companyPhone,
  canPay,
  testMode,
  initialPeriod = "monthly",
  verifyAfterPayment = false,
  heading = "Choisir une formule",
  description = "Paiement sécurisé par FeexPay, en FCFA.",
}: Props) {
  const router = useRouter();
  const country = getFeexPayCountry(countryCode);
  const operators = country?.operators ?? [];
  const [selectedPeriod, setSelectedPeriod] =
    useState<"monthly" | "annual">(initialPeriod);
  const [paymentMethod, setPaymentMethod] =
    useState<FeexPayPaymentMethod>("mobile_money");
  const [operator, setOperator] = useState<FeexPayOperator>(
    country?.operators[0]?.value ?? "mtn",
  );
  const [phone, setPhone] = useState(companyPhone);
  const [cardFirstName, setCardFirstName] = useState("");
  const [cardLastName, setCardLastName] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const selectedOperator =
    country && isFeexPayOperator(country.code, operator)
      ? operator
      : country?.operators[0]?.value;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{heading}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {description}
            {country ? ` · ${country.name}` : ""}
          </p>
        </div>
        {testMode ? (
          <span className="inline-flex min-h-8 items-center rounded-full bg-gray-100 px-3 text-xs font-semibold text-gray-600">
            Mode test · aucun paiement réel
          </span>
        ) : null}
      </div>

      {canPay ? (
        <>
          <div
            role="radiogroup"
            aria-label="Formule d'abonnement"
            className="grid gap-3 sm:grid-cols-2"
          >
            {(["monthly", "annual"] as const).map((choice) => {
              const isSelected = selectedPeriod === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedPeriod(choice)}
                  className={`flex min-h-24 flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? "border-accent bg-accent/5"
                      : "border-black/15 bg-white hover:border-black/40"
                  }`}
                >
                  <span className="text-sm font-semibold">
                    {choice === "monthly" ? "Offre mensuelle" : "Offre annuelle"}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold tabular-nums">
                      {formatCurrency(getSubscriptionPrice(choice))}
                    </span>
                    <span className="text-xs text-gray-600">
                      {choice === "monthly" ? "/ mois" : "/ an"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Moyen de paiement</p>
            <div
              role="radiogroup"
              aria-label="Moyen de paiement"
              className="grid grid-cols-2 gap-2"
            >
              {FEEXPAY_PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-black/15 bg-white text-black hover:border-black/40"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid gap-4 ${
              paymentMethod === "mobile_money" && operators.length > 0
                ? "sm:grid-cols-2"
                : ""
            }`}
          >
            {paymentMethod === "mobile_money" && operators.length > 0 ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Opérateur
                <select
                  value={selectedOperator}
                  onChange={(event) => {
                    if (
                      country &&
                      isFeexPayOperator(country.code, event.target.value)
                    ) {
                      setOperator(event.target.value);
                    }
                  }}
                  className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
                >
                  {operators.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Téléphone de paiement
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={`+${country?.callingCode ?? ""} …`}
                className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
              />
            </label>
          </div>

          {paymentMethod === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Prénom du titulaire
                <input
                  type="text"
                  autoComplete="given-name"
                  value={cardFirstName}
                  onChange={(event) => setCardFirstName(event.target.value)}
                  required
                  className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nom du titulaire
                <input
                  type="text"
                  autoComplete="family-name"
                  value={cardLastName}
                  onChange={(event) => setCardLastName(event.target.value)}
                  required
                  className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Ville
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                  className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Code postal
                <input
                  type="text"
                  autoComplete="postal-code"
                  value={zip}
                  onChange={(event) => setZip(event.target.value)}
                  required
                  className="min-h-12 rounded-lg border border-black/15 bg-white px-3 text-sm"
                />
              </label>
            </div>
          ) : null}

          <FeexPayCheckoutButton
            period={selectedPeriod}
            method={paymentMethod}
            phone={phone}
            operator={
              paymentMethod === "mobile_money" ? selectedOperator : undefined
            }
            city={city}
            zip={zip}
            firstName={cardFirstName}
            lastName={cardLastName}
          />

          {verifyAfterPayment ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.refresh()}
            >
              J&apos;ai payé — vérifier l&apos;activation
            </Button>
          ) : null}
        </>
      ) : (
        <div
          role="alert"
          className="rounded-lg border border-red/20 bg-red/5 p-4 text-sm text-red"
        >
          Le paiement en ligne est temporairement indisponible. Réessayez plus
          tard ou contactez l&apos;équipe AvisTrack.
        </div>
      )}
    </div>
  );
}
