"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfile, type ProfileFormState } from "./actions";

const inputClass =
  "min-h-11 w-full rounded border border-black/30 bg-white px-3 text-sm aria-[invalid=true]:border-red";

const initialState: ProfileFormState = { status: "idle" };

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="flex max-w-md flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="profile-name" className="text-sm font-semibold">
          Nom de l&apos;entreprise
        </label>
        <input
          id="profile-name"
          name="name"
          defaultValue={name}
          required
          maxLength={120}
          autoComplete="organization"
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name ? "profile-name-error" : undefined}
          className={inputClass}
        />
        {state.errors?.name ? (
          <p id="profile-name-error" className="text-sm text-red">
            {state.errors.name}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="profile-phone" className="text-sm font-semibold">
          Téléphone
        </label>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          required
          autoComplete="tel"
          aria-invalid={Boolean(state.errors?.phone)}
          aria-describedby={
            state.errors?.phone ? "profile-phone-error" : "profile-phone-hint"
          }
          className={inputClass}
        />
        {state.errors?.phone ? (
          <p id="profile-phone-error" className="text-sm text-red">
            {state.errors.phone}
          </p>
        ) : (
          <p id="profile-phone-hint" className="text-xs text-gray-600">
            Format international, par exemple +22901970000.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <p
          role="status"
          className={`text-sm ${state.status === "error" ? "text-red" : ""}`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
