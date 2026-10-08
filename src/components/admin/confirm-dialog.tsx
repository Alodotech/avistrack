"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { AdminActionState } from "@/app/(admin)/admin/actions";

type Props = {
  triggerLabel: string;
  /** Complète le libellé du bouton pour les lecteurs d'écran (nom de l'entreprise). */
  triggerContext: string;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: (
    state: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
  fields: Record<string, string>;
  /** Confirmation forte : texte que l'administrateur doit recopier. */
  typedConfirmation?: string;
};

const initialState: AdminActionState = { status: "idle" };

/**
 * Bouton + boîte de dialogue de confirmation (AD-03, AD-04), sur l'élément
 * natif `<dialog>` : piège du focus et fermeture par Échap fournis par le
 * navigateur.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerContext,
  title,
  description,
  confirmLabel,
  destructive = false,
  action,
  fields,
  typedConfirmation,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    if (state.status === "done") dialogRef.current?.close();
  }, [state]);

  return (
    <>
      <Button
        type="button"
        variant={destructive ? "ghost" : "secondary"}
        className="min-h-9 px-3"
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
        <span className="sr-only"> {triggerContext}</span>
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded border border-black bg-white p-6 text-left text-black backdrop:bg-black/60"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm leading-6">{description}</p>

          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          {typedConfirmation ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-sm font-semibold">
                Pour confirmer, saisissez « {typedConfirmation} »
              </label>
              <input
                id={inputId}
                name="confirmation"
                required
                autoComplete="off"
                className="min-h-11 rounded border border-black/30 px-3 text-sm"
              />
            </div>
          ) : null}

          <p role="alert" className="min-h-5 text-sm text-red">
            {state.status === "error" ? state.message : null}
          </p>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "En cours…" : confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
