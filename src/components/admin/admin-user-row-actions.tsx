"use client";

import { useTransition, useState, useId, useRef } from "react";
import {
  assignAdminRoleAction,
  updateAdminPermissionsAction,
  updateAdminRoleAction,
  removeAdminAction,
} from "@/app/(admin)/admin/utilisateurs/actions";
import type { RoleOption } from "@/components/admin/admin-roles-panel";
import {
  ADMIN_LEVEL_LABELS,
  ADMIN_MODULE_DESCRIPTIONS,
  ADMIN_MODULE_LABELS,
  defaultAdminPermissions,
} from "@/lib/admin-permissions";
import {
  ADMIN_MODULES,
  ADMIN_PERMISSION_LEVELS,
  type AdminPermissionLevel,
  type AdminPermissions,
  type AdminRole,
} from "@/server/domain";

export function AdminUserRowActions({
  adminId,
  currentRole,
  currentRoleId,
  roles,
  currentPermissions,
  userEmail,
  isCurrentAdmin,
}: {
  adminId: string;
  currentRole: AdminRole;
  currentRoleId: string | null;
  roles: RoleOption[];
  currentPermissions: AdminPermissions;
  userEmail: string;
  isCurrentAdmin: boolean;
}) {
  const [role, setRole] = useState<AdminRole>(currentRole);
  const [roleId, setRoleId] = useState<string>(currentRoleId ?? "");
  const [isAssigning, startAssignTransition] = useTransition();
  const [permissions, setPermissions] = useState<AdminPermissions>(
    currentPermissions,
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSavingPermissions, startPermissionsTransition] = useTransition();
  const permissionsDialogRef = useRef<HTMLDialogElement>(null);
  const [isPendingRole, startRoleTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const handleRoleChange = (newRole: AdminRole) => {
    setRole(newRole);
    setPermissions(defaultAdminPermissions(newRole));
    startRoleTransition(async () => {
      const res = await updateAdminRoleAction(adminId, newRole);
      if (!res.ok) {
        setRole(currentRole);
        alert(res.error ?? "Erreur lors du changement de rôle.");
      }
    });
  };

  const handleCustomRoleChange = (nextRoleId: string) => {
    const previous = roleId;
    setRoleId(nextRoleId);
    startAssignTransition(async () => {
      const res = await assignAdminRoleAction(adminId, nextRoleId || null);
      if (!res.ok) {
        setRoleId(previous);
        alert(res.error ?? "Erreur lors de l'assignation du rôle.");
      }
    });
  };

  const savePermissions = () => {
    setPermissionError(null);
    startPermissionsTransition(async () => {
      const res = await updateAdminPermissionsAction(adminId, permissions);
      if (!res.ok) {
        setPermissionError(res.error ?? "Impossible d'enregistrer les permissions.");
        return;
      }
      permissionsDialogRef.current?.close();
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

      {/* Rôle personnalisé : remplace les permissions individuelles */}
      <div className="relative">
        <select
          value={roleId}
          disabled={isAssigning || roles.length === 0}
          onChange={(event) => handleCustomRoleChange(event.target.value)}
          aria-label={`Rôle personnalisé pour ${userEmail}`}
          className="h-8 max-w-40 appearance-none rounded-lg border border-black/15 bg-white px-2.5 pr-7 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50"
        >
          <option value="">Rôle standard</option>
          {roles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <button
        type="button"
        onClick={() => permissionsDialogRef.current?.showModal()}
        className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100"
      >
        Permissions
      </button>

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

      <dialog
        ref={permissionsDialogRef}
        aria-label={`Permissions de ${userEmail}`}
        className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-black/15 bg-white p-6 text-left text-black shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="text-base font-bold text-black">
              Permissions de {userEmail}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Chaque module peut être masqué, consulté en lecture seule ou géré
              complètement. Les actions d’écriture exigent la gestion complète.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ADMIN_MODULES.map((module) => (
              <label
                key={module}
                className="flex flex-col gap-1.5 rounded-xl border border-black/10 bg-gray-50/60 p-3"
              >
                <span className="text-xs font-bold text-black">
                  {ADMIN_MODULE_LABELS[module]}
                </span>
                <span className="text-[0.7rem] leading-4 text-gray-500">
                  {ADMIN_MODULE_DESCRIPTIONS[module]}
                </span>
                <select
                  value={permissions[module]}
                  onChange={(event) =>
                    setPermissions((current) => ({
                      ...current,
                      [module]: event.target.value as AdminPermissionLevel,
                    }))
                  }
                  className="mt-1 h-9 rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold"
                >
                  {ADMIN_PERMISSION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {ADMIN_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {permissionError ? (
            <p role="alert" className="rounded-xl border border-red/20 bg-red/10 p-3 text-xs font-medium text-red">
              {permissionError}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => permissionsDialogRef.current?.close()}
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isSavingPermissions}
              onClick={savePermissions}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
            >
              {isSavingPermissions ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
