"use client";

import { useActionState, useState } from "react";
import { FeexPayPaymentForm } from "@/components/billing/feexpay-payment-form";
import { Button } from "@/components/ui/button";
import { LOGO_REQUIRED } from "@/lib/company-status";
import { FEEXPAY_COUNTRIES, getFeexPayCountry } from "@/lib/feexpay";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

export function OnboardingForm({
  email,
  phone,
  countryCode,
  name,
  canPay,
  testMode,
  initialStep = "profile",
}: {
  email: string;
  phone: string;
  countryCode: string;
  name: string;
  canPay: boolean;
  testMode: boolean;
  initialStep?: "profile" | "plan";
}) {
  const [state, action, pending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCode);
  const country =
    getFeexPayCountry(selectedCountryCode) ?? FEEXPAY_COUNTRIES[0];
  const profileComplete =
    state.status === "saved" ||
    (initialStep === "plan" && state.status === "idle");
  const step =
    profileComplete && !editingProfile && state.status !== "error"
      ? "plan"
      : "profile";

  return step === "profile" ? (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-7 rounded-2xl border border-black/10 bg-white p-6 text-black shadow-lg sm:p-10">
      <header className="flex flex-col text-center">
        <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-accent uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Dernière étape
        </span>
        <h1 className="text-xl font-bold tracking-tight text-black">
          Complétez votre espace
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Plus que quelques informations pour préparer votre tableau de bord et
          votre QR code.
        </p>
      </header>

        <form
          action={action}
          onSubmit={() => setEditingProfile(false)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-name" className="text-sm font-semibold">
              Nom de l&apos;entreprise
            </label>
            <input
              id="onboarding-name"
              name="name"
              defaultValue={name}
              required
              autoComplete="organization"
              aria-invalid={Boolean(state.errors?.name)}
              className={inputClass}
            />
            {state.errors?.name ? (
              <p className="text-sm text-red">{state.errors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-country" className="text-sm font-semibold">
              Pays de l&apos;entreprise
            </label>
            <select
              id="onboarding-country"
              name="countryCode"
              defaultValue={countryCode}
              required
              onChange={(event) => setSelectedCountryCode(event.target.value)}
              aria-invalid={Boolean(state.errors?.countryCode)}
              className={inputClass}
            >
              {FEEXPAY_COUNTRIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            {state.errors?.countryCode ? (
              <p className="text-sm text-red">{state.errors.countryCode}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-phone" className="text-sm font-semibold">
              Téléphone professionnel
            </label>
            <input
              id="onboarding-phone"
              name="phone"
              type="tel"
              defaultValue={phone}
              required
              autoComplete="tel"
              placeholder={`+${country.callingCode} …`}
              aria-invalid={Boolean(state.errors?.phone)}
              aria-describedby={
                state.errors?.phone
                  ? "onboarding-phone-error"
                  : "onboarding-phone-hint"
              }
              className={inputClass}
            />
            {state.errors?.phone ? (
              <p id="onboarding-phone-error" className="text-sm text-red">
                {state.errors.phone}
              </p>
            ) : (
              <p id="onboarding-phone-hint" className="text-xs text-gray-600">
                Format international avec l&apos;indicatif {`+${country.callingCode}`}.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-logo" className="text-sm font-semibold">
              Logo ({LOGO_REQUIRED ? "obligatoire" : "facultatif"})
            </label>
            <input
              id="onboarding-logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required={LOGO_REQUIRED}
              className="min-h-11 w-full rounded-md border border-black/30 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            <p className="text-xs text-gray-600">
              PNG, JPG ou WebP, 700 Ko maximum.
            </p>
            {state.errors?.logo ? (
              <p className="text-sm text-red">{state.errors.logo}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-email" className="text-sm font-semibold">
              Adresse e-mail de connexion
            </label>
            <input
              id="onboarding-email"
              name="email"
              type="email"
              value={email}
              readOnly
              className={`${inputClass} bg-gray-100 text-gray-600`}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement…" : "Continuer"}
            </Button>
            {state.message && state.status === "error" ? (
              <p role="alert" className="text-center text-sm text-red">
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
    </div>
  ) : (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 text-black">
      <header className="mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-accent uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Votre forfait
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
          Choisissez votre offre
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
          Finalisez l&apos;inscription de <strong className="text-black">{name}</strong>.
          Vous pourrez changer d&apos;offre à tout moment depuis votre espace.
        </p>
      </header>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-7">
        <aside className="relative overflow-hidden rounded-2xl bg-black p-6 text-white sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 size-64 rounded-full border-[36px] border-accent/20"
          />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.16em] text-white/65 uppercase">
              Votre espace professionnel
            </p>
            <h2 className="mt-5 max-w-sm text-2xl font-bold leading-tight sm:text-3xl">
              Votre compte est presque prêt.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
              Sélectionnez une formule et finalisez le paiement pour activer
              votre tableau de bord.
            </p>

            <ol className="mt-8 space-y-5">
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold">
                  01
                </span>
                <div>
                  <p className="text-sm font-semibold">Choisissez une formule</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">
                    Mensuelle ou annuelle, selon votre préférence.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold">
                  02
                </span>
                <div>
                  <p className="text-sm font-semibold">Payez avec FeexPay</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">
                    Mobile Money ou carte bancaire.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold">
                  03
                </span>
                <div>
                  <p className="text-sm font-semibold">Accédez au tableau de bord</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">
                    L&apos;accès est activé après confirmation du paiement.
                  </p>
                </div>
              </li>
            </ol>
          </div>

        </aside>

        <section className="flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-7">
          <FeexPayPaymentForm
            countryCode={selectedCountryCode}
            companyPhone={phone}
            canPay={canPay}
            testMode={testMode}
            verifyAfterPayment
            heading="Votre formule"
            description="Paiement sécurisé par FeexPay."
          />

          <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-gray-600">
              Paiement en FCFA · {country.name}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProfile(true)}
            >
              Modifier mes informations
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
