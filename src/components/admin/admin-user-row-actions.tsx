"use client";

import { useTransition, useState, useId, useRef } from "react";
import {
  updateAdminRoleAction,
  removeAdminAction,
} from "@/app/(admin)/admin/utilisateurs/actions";
import type { AdminRole } from "@/server/domain";

export function AdminUserRowActions({
  adminId,
  currentRole,
  userEmail,
  isCurrentAdmin,
}: {
  adminId: string;
  currentRole: AdminRole;
  userEmail: string;
  isCurrentAdmin: boolean;
}) {
  const [role, setRole] = useState<AdminRole>(currentRole);
  const [isPendingRole, startRoleTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const handleRoleChange = (newRole: AdminRole) => {
    setRole(newRole);
    startRoleTransition(async () => {
      const res = await updateAdminRoleAction(adminId, newRole);
      if (!res.ok) {
        setRole(currentRole);
        alert(res.error ?? "Erreur lors du changement de rôle.");
      }
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const res = await removeAdminAction(adminId);
    if (!res.ok) {
      setDeleteError(res.error ?? "Impossible de révoquer cet administrateur.");
      setIsDeleting(false);
    } else {
      dialogRef.current?.close();
    }
  };

  return (
    <div className="flex items-center justify-end gap-2.5">
      {/* Sélecteur de rôle interactif */}
      <div className="relative">
        <select
          value={role}
          disabled={isPendingRole}
          onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
          className={`h-8 appearance-none rounded-lg border px-2.5 pr-7 text-xs font-semibold transition-all cursor-pointer ${
            role === "dirigeant"
              ? "border-amber-400/40 bg-amber-50 text-amber-900"
              : "border-black/15 bg-white text-gray-800"
          } focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50`}
        >
          <option value="admin">Administrateur</option>
          <option value="dirigeant">Dirigeant AvisTrack</option>
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Bouton de révocation */}
      {isCurrentAdmin ? (
        <span className="rounded-md bg-gray-100 px-2 py-1 text-[0.7rem] font-semibold text-gray-400 cursor-not-allowed">
          Votre compte
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="flex size-8 items-center justify-center rounded-lg border border-red/20 bg-red/5 text-red hover:bg-red/10 transition-colors cursor-pointer"
            title="Révoquer l'accès"
            aria-label={`Révoquer l'accès pour ${userEmail}`}
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Dialogue de confirmation de suppression */}
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-black/15 bg-white p-6 text-left text-black shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
          >
            <div className="flex flex-col gap-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-red/10 text-red">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div>
                <h3 id={titleId} className="text-base font-bold text-black">
                  Révoquer l&apos;accès administrateur
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  Êtes-vous sûr de vouloir retirer les droits d&apos;administration de{" "}
                  <strong className="text-black font-semibold">{userEmail}</strong> ? Cette personne ne pourra plus accéder à la console de gestion AvisTrack.
                </p>
              </div>

              {deleteError && (
                <div role="alert" className="rounded-xl border border-red/20 bg-red/10 p-2.5 text-xs text-red font-medium">
                  {deleteError}
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-red px-4 py-2 text-xs font-bold text-white hover:bg-red/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isDeleting ? "Révocation..." : "Confirmer la révocation"}
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
