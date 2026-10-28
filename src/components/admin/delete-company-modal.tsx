"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { deleteCompanyAction } from "@/app/(admin)/admin/entreprises/actions";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";

type Props = {
  companyId: string;
  name: string;
};

export function DeleteCompanyModal({ companyId, name }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [instanceId, setInstanceId] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInstanceId((prev) => prev + 1);
          dialogRef.current?.showModal();
        }}
        title={`Supprimer définitivement ${name}`}
        aria-label={`Supprimer définitivement ${name}`}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-red/25 bg-white text-red hover:border-red/50 hover:bg-red/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
      >
        <TrashIcon className="size-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-red bg-white p-6 text-left text-black backdrop:bg-black/60 shadow-xl"
      >
        <DeleteDialogBody
          key={instanceId}
          dialogRef={dialogRef}
          companyId={companyId}
          name={name}
        />
      </dialog>
    </>
  );
}

function DeleteDialogBody({
  dialogRef,
  companyId,
  name,
}: Props & {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [state, formAction, pending] = useActionState(deleteCompanyAction, {
    status: "idle",
  });
  const [typedValue, setTypedValue] = useState("");

  const titleId = useId();
  const inputId = useId();
  const reasonId = useId();

  const isConfirmed = typedValue.trim() === name.trim();

  useEffect(() => {
    if (state.status === "done") {
      dialogRef.current?.close();
    }
  }, [dialogRef, state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-lg font-bold text-red">
          Supprimer « {name} » ?
        </h2>
        <div className="rounded-md border border-red/20 bg-red/5 p-3 text-sm text-gray-800 leading-relaxed">
          <p className="font-semibold text-red mb-1">Action irréversible</p>
          Le compte est désactivé immédiatement et retiré de la liste publique.
          Toutes ses données, avis clients compris, seront définitivement purgées au
          bout de 30 jours.
        </div>
      </div>

      <input type="hidden" name="companyId" value={companyId} />

      {/* Confirmation textuelle stricte */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold">
          Pour confirmer, saisissez exactement « <span className="font-mono text-red">{name}</span> » :
        </label>
        <input
          id={inputId}
          name="confirmation"
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          required
          autoComplete="off"
          placeholder={name}
          className="min-h-11 rounded-md border border-black/30 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red"
        />
      </div>

      {/* Motif obligatoire de suppression */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className="text-sm font-semibold">
          Motif de la suppression
        </label>
        <textarea
          id={reasonId}
          name="reason"
          required
          minLength={5}
          maxLength={500}
          rows={3}
          placeholder="Ex. : demande explicite de l'entreprise, compte créé par erreur…"
          className="w-full rounded-md border border-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red"
        />
        <p className="text-xs text-gray-600">
          Ce motif est consigné au journal d&apos;audit.
        </p>
      </div>

      <p role="alert" className="min-h-5 text-sm text-red font-medium">
        {state.status === "error" ? state.message : null}
      </p>

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-black/10">
        <Button
          type="button"
          variant="secondary"
          onClick={() => dialogRef.current?.close()}
        >
          Annuler
        </Button>
        <button
          type="submit"
          disabled={pending || !isConfirmed}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full min-h-11 px-4 text-sm font-semibold whitespace-nowrap transition-colors bg-red text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Suppression en cours…" : "Supprimer définitivement"}
        </button>
      </div>
    </form>
  );
}
