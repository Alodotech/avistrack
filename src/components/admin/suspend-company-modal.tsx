"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { changeCompanyStatusAction } from "@/app/(admin)/admin/entreprises/actions";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "@/components/ui/icons";
import type { CompanyStatus } from "@/server/domain";

type Props = {
  companyId: string;
  name: string;
  status: CompanyStatus;
};

export function SuspendCompanyModal({ companyId, name, status }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [instanceId, setInstanceId] = useState(0);

  const title =
    status === "ACTIVE"
      ? `Suspendre ${name}`
      : `Gérer le statut de ${name}`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInstanceId((prev) => prev + 1);
          dialogRef.current?.showModal();
        }}
        title={title}
        aria-label={title}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-black/15 bg-white text-gray-700 hover:border-black/40 hover:bg-black/5 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        <PencilIcon className="size-4" />
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-black bg-white p-6 text-left text-black backdrop:bg-black/60 shadow-xl"
      >
        <SuspendDialogBody
          key={instanceId}
          dialogRef={dialogRef}
          companyId={companyId}
          name={name}
          status={status}
        />
      </dialog>
    </>
  );
}

function SuspendDialogBody({
  dialogRef,
  companyId,
  name,
  status,
}: Props & {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [state, formAction, pending] = useActionState(changeCompanyStatusAction, {
    status: "idle",
  });
  const [actionChoice, setActionChoice] = useState<"SUSPEND" | "REACTIVATE">(
    status === "SUSPENDED" ? "REACTIVATE" : "SUSPEND",
  );

  const titleId = useId();
  const dateId = useId();
  const reasonId = useId();

  // Date du jour au format AAAA-MM-JJ pour valeur par défaut
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.status === "done") {
      dialogRef.current?.close();
    }
  }, [dialogRef, state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-lg font-semibold">
            {actionChoice === "SUSPEND"
              ? `Suspendre « ${name} »`
              : `Réactiver « ${name} »`}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {actionChoice === "SUSPEND"
              ? "L'entreprise ne pourra plus se connecter et son formulaire public cessera d'accepter les avis."
              : "L'entreprise retrouvera l'accès à son compte et son formulaire public sera réactivé avec son QR code."}
          </p>
        </div>
      </div>

      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="change" value={actionChoice} />

      {/* Si l'entreprise est déjà suspendue, permettre de basculer entre réactivation ou ajustement */}
      {status === "SUSPENDED" ? (
        <fieldset className="flex flex-col gap-2 rounded-md border border-black/15 bg-gray-50 p-3 text-sm">
          <legend className="px-1 font-semibold text-xs text-gray-700 uppercase tracking-wider">
            Action à exécuter
          </legend>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-green-800">
            <input
              type="radio"
              name="statusSelection"
              checked={actionChoice === "REACTIVATE"}
              onChange={() => setActionChoice("REACTIVATE")}
              className="size-4 text-green-600"
            />
            Réactiver l&apos;entreprise immédiatement
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="radio"
              name="statusSelection"
              checked={actionChoice === "SUSPEND"}
              onChange={() => setActionChoice("SUSPEND")}
              className="size-4"
            />
            Maintenir suspendue / ajuster la date et motif
          </label>
        </fieldset>
      ) : null}

      {/* Date de suspension */}
      {actionChoice === "SUSPEND" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={dateId} className="text-sm font-semibold">
            Date d&apos;effet de la suspension
          </label>
          <input
            id={dateId}
            name="suspensionDate"
            type="date"
            defaultValue={todayStr}
            required
            className="min-h-11 rounded-md border border-black/30 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-600">
            Date à partir de laquelle la suspension prend effet.
          </p>
        </div>
      ) : null}

      {/* Motif obligatoire consigné au journal d'audit */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className="text-sm font-semibold">
          {actionChoice === "SUSPEND"
            ? "Motif de la suspension"
            : "Motif de la réactivation"}
        </label>
        <textarea
          id={reasonId}
          name="reason"
          required
          minLength={5}
          maxLength={500}
          rows={3}
          placeholder={
            actionChoice === "SUSPEND"
              ? "Ex. : non-respect des conditions d'utilisation, avis frauduleux répétés, demande du client…"
              : "Ex. : régularisation du dossier, demande de réactivation confirmée…"
          }
          className="w-full rounded-md border border-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="text-xs text-gray-600">
          Ce motif est consigné au journal d&apos;audit.
        </p>
      </div>

      <p role="alert" className="min-h-5 text-sm text-red">
        {state.status === "error" ? state.message : null}
      </p>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => dialogRef.current?.close()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={pending}
          variant={actionChoice === "SUSPEND" ? "primary" : "secondary"}
        >
          {pending
            ? "En cours…"
            : actionChoice === "SUSPEND"
            ? "Confirmer la suspension"
            : "Réactiver l'entreprise"}
        </Button>
      </div>
    </form>
  );
}
