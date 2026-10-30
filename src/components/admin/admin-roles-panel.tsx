"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdminRoleAction } from "@/app/(admin)/admin/utilisateurs/actions";
import { Button } from "@/components/ui/button";
import {
  ADMIN_LEVEL_LABELS,
  ADMIN_MODULE_LABELS,
} from "@/lib/admin-permissions";
import {
  ADMIN_MODULES,
  ADMIN_PERMISSION_LEVELS,
  type AdminPermissionLevel,
  type AdminPermissions,
} from "@/server/domain";

export type RoleOption = {
  id: string;
  name: string;
  permissions: AdminPermissions;
};

const DEFAULT_LEVEL: AdminPermissionLevel = "read";

/** Création d'un rôle : nom + un niveau (aucun / lecture / gestion) par module. */
export function AdminRolesPanel({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<AdminPermissions>(() =>
    Object.fromEntries(
      ADMIN_MODULES.map((module) => [module, DEFAULT_LEVEL]),
    ) as AdminPermissions,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createAdminRoleAction(name, permissions);
      if (!result.ok) {
        setError(result.error ?? "La création du rôle a échoué.");
        return;
      }
      setName("");
      setNotice("Rôle créé. Vous pouvez l'assigner à un membre ci-dessous.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-black">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
            +
          </span>
          Créer un rôle
        </h2>
        <p className="text-xs text-gray-600">
          Un rôle regroupe un droit par module. Assignez-le ensuite à un membre
          depuis le tableau : ses permissions individuelles sont remplacées.
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <label htmlFor="role-name" className="text-xs font-semibold text-gray-700">
            Nom du rôle
          </label>
          <input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            placeholder="ex: Chargé de reporting"
            className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm text-black placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
          />
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-1 text-xs font-semibold text-gray-700">
            Droits par module
          </legend>
          {ADMIN_MODULES.map((module) => (
            <label
              key={module}
              className="flex flex-col gap-1.5 rounded-xl border border-black/10 bg-gray-50/60 p-3"
            >
              <span className="text-xs font-bold text-black">
                {ADMIN_MODULE_LABELS[module]}
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
        </fieldset>

        {error ? (
          <p role="alert" className="rounded-xl border border-red/20 bg-red/10 p-3 text-xs font-medium text-red">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800">
            {notice}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Création…" : "Créer le rôle"}
          </Button>
        </div>
      </form>

      <div className="border-t border-black/10 pt-4">
        <h3 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
          Rôles existants
        </h3>
        {roles.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Aucun rôle personnalisé pour le moment.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <li
                key={role.id}
                className="rounded-full border border-black/15 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800"
                title={ADMIN_MODULES.map(
                  (module) => `${module}: ${role.permissions[module]}`,
                ).join(" · ")}
              >
                {role.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
