"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LOGO_REQUIRED } from "@/lib/company-status";
import { formatCurrency } from "@/lib/format";
import { AVIS_TRACK_PRICING } from "@/lib/pricing";
import { activateTrialAction } from "@/server/actions/payments";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

type PlanChoice = "trial";

const PLANS: { id: PlanChoice; title: string; price: number; hint: string }[] = [
  {
    id: "trial",
    title: "Essai gratuit",
    price: AVIS_TRACK_PRICING.trial,
    hint: "14 jours offerts, sans paiement.",
  },
];

export function OnboardingForm({
  email,
  phone,
  name,
  initialStep = "profile",
}: {
  email: string;
  phone: string;
  name: string;
  initialStep?: "profile" | "plan";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const profileComplete =
    state.status === "saved" ||
    (initialStep === "plan" && state.status === "idle");
  const step =
    profileComplete && !editingProfile && state.status !== "error"
      ? "plan"
      : "profile";
  const [trialPending, startTrial] = useTransition();
  const [planError, setPlanError] = useState<string | null>(null);

  function continueWithPlan() {
    setPlanError(null);
    startTrial(async () => {
      const result = await activateTrialAction();
      if (!result.ok) {
        setPlanError(result.message ?? "L'activation de l'essai a échoué.");
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="flex w-full flex-col gap-7 rounded-3xl border border-black/10 bg-white p-7 text-black shadow-xl sm:p-10">
      <header className="flex flex-col text-center">
        <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] text-accent uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {step === "profile" ? "Dernière étape" : "Votre forfait"}
        </span>
        <h1 className="text-xl font-bold tracking-tight text-black">
          {step === "profile" ? "Complétez votre espace" : "Choisissez votre offre"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {step === "profile"
            ? "Plus que quelques informations pour préparer votre tableau de bord et votre QR code."
            : "Vous pourrez changer d'offre à tout moment depuis votre espace."}
        </p>
      </header>

      {step === "profile" ? (
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
              placeholder="+22901970000"
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
                Format international, par exemple +22901970000.
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
      ) : (
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Choix du forfait" className="flex flex-col gap-3">
            {PLANS.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  "trial" === item.id
                    ? "border-accent bg-accent/5"
                    : "border-black/10 bg-white hover:border-black/30"
                }`}
              >
                <input
                  type="radio"
                  name="onboarding-plan"
                  value={item.id}
                  checked={"trial" === item.id}
                  onChange={() => {}}
                  className="mt-1 accent-accent"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.title}</span>
                    <span className="font-bold tabular-nums">
                      {item.price === 0 ? "Gratuit" : formatCurrency(item.price)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-600">
                    {item.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {planError ? (
            <p role="alert" className="text-sm text-red">
              {planError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-black/10 pt-5">
            <Button
              type="button"
              onClick={continueWithPlan}
              disabled={trialPending}
              className="w-full"
            >
              {trialPending ? "Activation…" : "Commencer l'essai gratuit"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProfile(true)}
            >
              Modifier mes informations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
