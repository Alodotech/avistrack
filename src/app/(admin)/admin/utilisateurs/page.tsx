import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Panel } from "@/components/ui/panel";
import { tableStyles as t } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { requireAdminPermission } from "@/server/auth/guards";
import { listAdmins } from "@/server/repositories/admin-repository";
import { listAdminRoles } from "@/server/repositories/admin-role-repository";
import { AddAdminForm } from "@/components/admin/add-admin-form";
import { AdminRoleBadge } from "@/components/admin/admin-role-badge";
import { AdminRolesPanel } from "@/components/admin/admin-roles-panel";
import { AdminUserRowActions } from "@/components/admin/admin-user-row-actions";

export const metadata: Metadata = {
  title: "Utilisateurs & Équipe",
  robots: { index: false },
};

export default function AdminUsersPage() {
  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les membres de l'équipe AvisTrack, leurs accès et leurs attributions de rôles."
      />

      <div className="flex flex-col gap-8">
        {/* Formulaire d'ajout rapide d'un membre */}
        <AddAdminForm />

        {/* Tableau listant l'équipe */}
        <Suspense
          fallback={
            <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-sm text-gray-500">
              Chargement des utilisateurs…
            </div>
          }
        >
          <AdminUsersTableContent />
        </Suspense>
      </div>
    </>
  );
}

async function AdminUsersTableContent() {
  const currentAdmin = await requireAdminPermission("users");
  const [admins, roles] = await Promise.all([listAdmins(), listAdminRoles()]);
  const roleOptions = roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions,
  }));

  return (
    <>
      <AdminRolesPanel roles={roleOptions} />
    <Panel
      id="utilisateurs"
      title="Équipe d'administration"
      description={`${admins.length} utilisateur(s) autorisé(s) sur la plateforme AvisTrack.`}
      flush
    >
      <div className={t.wrapper}>
        <table className={t.table}>
          <thead className={t.head}>
            <tr>
              <th scope="col" className={t.th}>
                Utilisateur
              </th>
              <th scope="col" className={t.th}>
                Rôle
              </th>
              <th scope="col" className={t.th}>
                Date d&apos;ajout
              </th>
              <th scope="col" className={t.th}>
                Statut
              </th>
              <th scope="col" className={`${t.th} text-right`}>
                Gestion du rôle & Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const isCurrent = admin.userId === currentAdmin.id;
              const initials = admin.email.slice(0, 2).toUpperCase();

              return (
                <tr key={admin.id} className={t.row}>
                  {/* Identité / E-mail */}
                  <td className={t.td}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-800">
                        {initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-black truncate max-w-xs sm:max-w-md">
                            {admin.email}
                          </span>
                          {isCurrent && (
                            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[0.65rem] font-bold text-accent uppercase tracking-wider">
                              Vous
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          ID: {admin.userId ? admin.userId.slice(0, 8) + "…" : "En attente"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td className={t.td}>
                    <AdminRoleBadge role={admin.role} />
                  </td>

                  {/* Date d'ajout */}
                  <td className={`${t.td} text-gray-600 font-medium`}>
                    {formatDate(admin.createdAt)}
                  </td>

                  {/* Statut de compte */}
                  <td className={t.td}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Actif
                    </span>
                  </td>

                  {/* Actions & modification du rôle */}
                  <td className={`${t.td} text-right`}>
                    <AdminUserRowActions
                      adminId={admin.id}
                      currentRole={admin.role}
                      currentRoleId={admin.roleId}
                      roles={roleOptions}
                      currentPermissions={admin.permissions}
                      userEmail={admin.email}
                      isCurrentAdmin={isCurrent}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
    </>
  );
}
