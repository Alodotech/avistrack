"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signInAdmin, type AdminLoginState } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

const initialState: AdminLoginState = { status: "idle" };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, initialState);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/15 bg-white p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="text-sm text-gray-600">
          Accès réservé à l&apos;équipe AvisTrack.
        </p>
      </header>

      <form action={action} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-semibold">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-semibold">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-red">
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
