"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteAdminAction, type AdminActionResult } from "@/app/(admin)/admin/utilisateurs/actions";

export function AddAdminForm() {
  const [state, formAction, isPending] = useActionState<AdminActionResult | null, FormData>(
    inviteAdminAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-base font-bold text-black tracking-tight flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
            +
          </span>
          Ajouter un membre à l&apos;équipe AvisTrack
        </h2>
        <p className="text-xs text-gray-600">
          Invitez un collaborateur par son e-mail. Dès sa connexion Google, il accèdera à l&apos;espace d&apos;administration avec le rôle attribué.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          {/* Champ E-mail */}
          <div className="sm:col-span-6 flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-gray-700"
            >
              Adresse e-mail Google
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="ex: prenom.nom@gmail.com"
              className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm text-black placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
            />
          </div>

          {/* Choix du rôle */}
          <div className="sm:col-span-4 flex flex-col gap-1.5">
            <label
              htmlFor="role"
              className="text-xs font-semibold text-gray-700"
            >
              Rôle attribué
            </label>
            <div className="relative">
              <select
                id="role"
                name="role"
                defaultValue="admin"
                className="h-11 w-full appearance-none rounded-xl border border-black/15 bg-white px-3.5 pr-8 text-sm font-medium text-black focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
              >
                <option value="admin">Administrateur</option>
                <option value="dirigeant">Dirigeant AvisTrack</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bouton d'action */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-xl bg-accent px-4 text-xs font-bold text-white shadow-xs hover:bg-accent-deep transition-all duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Ajout...</span>
                </>
              ) : (
                <span>Ajouter</span>
              )}
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {state && !state.ok && state.error && (
          <div
            role="alert"
            className="rounded-xl border border-red/20 bg-red/10 p-3 text-xs font-medium text-red"
          >
            {state.error}
          </div>
        )}

        {/* Message de succès */}
        {state?.ok && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800"
          >
            L&apos;utilisateur a été ajouté avec succès à l&apos;équipe d&apos;administration.
          </div>
        )}
      </form>
    </div>
  );
}
