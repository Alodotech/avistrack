"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminActionState } from "@/app/(admin)/admin/entreprises/actions";

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
  /**
   * Motif obligatoire de l'action. Il est consigné au journal d'audit : une
   * suspension sans motif n'est pas acceptable.
   */
  reasonLabel?: string;
  reasonPlaceholder?: string;
};

const initialState: AdminActionState = { status: "idle" };

/**
 * Bouton + boîte de dialogue de confirmation (AD-03, AD-04 ; T35).
 *
 * L'élément natif `<dialog>` apporte le piège du focus et la fermeture par
 * Échap ; l'action est exécutée par la Server Action fournie.
 *
 * Le corps de la boîte est remonté à chaque ouverture (voir `instanceId`) :
 * l'état de l'action, le message d'erreur et les valeurs saisies repartent
 * ainsi de zéro, sans quoi une seconde ouverture afficherait la trace de la
 * première.
 */
export function ConfirmModal({
  triggerLabel,
  triggerContext,
  title,
  description,
  confirmLabel,
  destructive = false,
  action,
  fields,
  typedConfirmation,
  reasonLabel,
  reasonPlaceholder,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [instanceId, setInstanceId] = useState(0);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <Button
        type="button"
        variant={destructive ? "ghost" : "secondary"}
        size="sm"
        onClick={() => {
          setInstanceId((current) => current + 1);
          dialogRef.current?.showModal();
        }}
      >
        {triggerLabel}
        <span className="sr-only"> {triggerContext}</span>
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-black bg-white p-6 text-left text-black backdrop:bg-black/60"
      >
        <ConfirmDialogBody
          key={instanceId}
          dialogRef={dialogRef}
          titleId={titleId}
          descriptionId={descriptionId}
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          action={action}
          fields={fields}
          typedConfirmation={typedConfirmation}
          reasonLabel={reasonLabel}
          reasonPlaceholder={reasonPlaceholder}
        />
      </dialog>
    </>
  );
}

/**
 * Contenu de la boîte de dialogue. Isolé dans un composant pour que chaque
 * ouverture reparte d'un état neuf (remontage via la clé `instanceId`).
 */
function ConfirmDialogBody({
  dialogRef,
  titleId,
  descriptionId,
  title,
  description,
  confirmLabel,
  action,
  fields,
  typedConfirmation,
  reasonLabel,
  reasonPlaceholder,
}: Omit<Props, "triggerLabel" | "triggerContext" | "destructive"> & {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  titleId: string;
  descriptionId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const inputId = useId();
  const reasonId = useId();

  useEffect(() => {
    if (state.status === "done") dialogRef.current?.close();
  }, [dialogRef, state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p id={descriptionId} className="text-sm leading-6">
        {description}
      </p>

      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {reasonLabel ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={reasonId} className="text-sm font-semibold">
            {reasonLabel}
          </label>
          <textarea
            id={reasonId}
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            placeholder={reasonPlaceholder}
            className="w-full rounded-md border border-black/30 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-600">
            Ce motif est consigné au journal d&apos;audit.
          </p>
        </div>
      ) : null}

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
            className="min-h-11 rounded-md border border-black/30 px-3 text-sm"
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
  );
}
