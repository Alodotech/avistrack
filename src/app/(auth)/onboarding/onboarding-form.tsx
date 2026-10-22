"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { createAccount, type OnboardingState } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

const initialState: OnboardingState = { status: "idle" };

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createAccount, initialState);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/15 bg-white p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Créer mon compte</h1>
        <p className="text-sm text-gray-600">
          Quelques informations, puis votre QR code est prêt à imprimer.
        </p>
      </header>

      <form action={action} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-semibold">
            Nom du commerce
          </label>
          <input
            id="name"
            name="name"
            autoComplete="organization"
            placeholder="Pharmacie du Centre"
            aria-invalid={Boolean(state.errors?.name)}
            className={inputClass}
          />
          {state.errors?.name ? (
            <p className="text-sm text-red">{state.errors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-semibold">
            E-mail professionnel
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="contact@mon-commerce.fr"
            aria-invalid={Boolean(state.errors?.email)}
            className={inputClass}
          />
          {state.errors?.email ? (
            <p className="text-sm text-red">{state.errors.email}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-semibold">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+22901970000"
            aria-invalid={Boolean(state.errors?.phone)}
            className={inputClass}
          />
          {state.errors?.phone ? (
            <p className="text-sm text-red">{state.errors.phone}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-semibold">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            aria-invalid={Boolean(state.errors?.password)}
            className={inputClass}
          />
          {state.errors?.password ? (
            <p className="text-sm text-red">{state.errors.password}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </Button>

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-red">
            {state.message}
          </p>
        ) : null}
      </form>

      <p className="border-t border-black/15 pt-5 text-sm text-gray-600">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-semibold text-black underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
        <span className="h-px flex-1 bg-black/15" />
        ou
        <span className="h-px flex-1 bg-black/15" />
      </div>

      <GoogleSignInButton label="Continuer avec Google" />
    </div>
  );
}
