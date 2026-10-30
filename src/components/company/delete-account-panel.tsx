"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/(company)/dashboard/profil/actions";

const CONFIRMATION = "SUPPRIMER";

/**
 * Suppression du compte en deux temps : ouverture d'une explication, puis
 * saisie du mot de confirmation. Le serveur revérifie la valeur.
 */
export function DeleteAccountPanel({ companyName }: { companyName: string }) {
  const [step, setStep] = useState<"closed" | "explain" | "confirm">("closed");
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setStep("closed");
    setWord("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction(word);
      if (!result.ok) {
        setError(result.message ?? "La suppression a échoué.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red/30 bg-red/5 p-5">
      <h2 className="text-sm font-bold text-red">Supprimer mon compte</h2>
      <p className="text-xs leading-5 text-gray-700">
        La suppression retire immédiatement l&apos;accès à votre espace. Vos
        avis et votre piste d&apos;audit sont conservés puis effacés
        définitivement après 30 jours.
      </p>
      <button
        type="button"
        onClick={() => setStep("explain")}
        className="w-fit cursor-pointer text-sm font-semibold text-red underline underline-offset-4"
      >
        Supprimer mon compte
      </button>

      {step !== "closed" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={close}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-black shadow-2xl">
            <h3 id="delete-account-title" className="text-base font-bold">
              {step === "explain"
                ? `Supprimer ${companyName} ?`
                : "Confirmer la suppression"}
            </h3>

            {step === "explain" ? (
              <>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Cette action est irréversible depuis votre espace. Vous ne
                  pourrez plus recevoir d&apos;avis ni afficher votre QR code.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="cursor-pointer rounded-lg border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="cursor-pointer rounded-lg bg-red px-4 py-2 text-xs font-bold text-white hover:bg-red/90"
                  >
                    Continuer
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Saisissez <strong>{CONFIRMATION}</strong> pour confirmer
                  définitivement la suppression du compte « {companyName} ».
                </p>
                <label
                  htmlFor="delete-account-confirmation"
                  className="mt-4 block text-xs font-semibold text-gray-700"
                >
                  Confirmation
                </label>
                <input
                  id="delete-account-confirmation"
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  autoComplete="off"
                  className="mt-1 min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm"
                />
                {error ? (
                  <p role="alert" className="mt-2 text-sm text-red">
                    {error}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={close}
                    className="cursor-pointer rounded-lg border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={pending || word.trim().toUpperCase() !== CONFIRMATION}
                    onClick={submit}
                    className="cursor-pointer rounded-lg bg-red px-4 py-2 text-xs font-bold text-white hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? "Suppression…" : "Supprimer définitivement"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
