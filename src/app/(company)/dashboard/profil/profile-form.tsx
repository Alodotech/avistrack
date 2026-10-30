"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

const initialState: ProfileFormState = { status: "idle" };

export function ProfileForm({
  email,
  phone,
  name,
  logoUrl,
}: {
  email: string;
  phone: string;
  name: string;
  logoUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Nom de l&apos;entreprise
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
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
        <label htmlFor="profile-phone" className="text-sm font-medium">
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

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Logo</span>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <span
              role="img"
              aria-label="Logo actuel de l'entreprise"
              className="size-12 rounded-lg border border-black/10 bg-gray-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${logoUrl})` }}
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-lg border border-dashed border-black/20 text-xs text-gray-500">
              Aucun
            </span>
          )}
          <input
            id="profile-logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="min-h-11 w-full rounded-md border border-black/30 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            aria-describedby="profile-logo-hint"
          />
        </div>
        <p id="profile-logo-hint" className="text-xs text-gray-600">
          PNG, JPG ou WebP, 700 Ko maximum. Laissez vide pour conserver le logo.
        </p>
        {state.errors?.logo ? (
          <p className="text-sm text-red">{state.errors.logo}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="profile-email" className="text-sm font-semibold">
          Adresse e-mail
        </label>
        <input
          id="profile-email"
          name="email"
          type="email"
          value={email}
          readOnly
          className={`${inputClass} bg-gray-100 text-gray-600`}
        />
        <p className="text-xs text-gray-600">
          Cette adresse est liée à votre compte Google.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
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
