import {
  ADMIN_MODULES,
  ADMIN_PERMISSION_LEVELS,
  type AdminModule,
  type AdminPermissionLevel,
  type AdminPermissions,
  type AdminRole,
} from "@/server/domain";

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: "Tableau de bord & graphiques",
  companies: "Entreprises",
  finances: "Finances & abonnements",
  users: "Utilisateurs & équipe",
  audit: "Journal d'audit",
  reports: "Rapports",
};

export const ADMIN_MODULE_DESCRIPTIONS: Record<AdminModule, string> = {
  dashboard: "Indicateurs, tendances et activité récente.",
  companies: "Consulter et gérer le parc d'entreprises.",
  finances: "Suivre et modifier les abonnements.",
  users: "Inviter, révoquer et attribuer les permissions.",
  audit: "Consulter la trace des actions administratives.",
  reports: "Télécharger les rapports mensuels et annuels.",
};

export const ADMIN_LEVEL_LABELS: Record<AdminPermissionLevel, string> = {
  none: "Aucun accès",
  read: "Lecture seule",
  manage: "Gestion complète",
};

const LEVEL_RANK: Record<AdminPermissionLevel, number> = {
  none: 0,
  read: 1,
  manage: 2,
};

export function allAdminPermissions(
  level: AdminPermissionLevel,
): AdminPermissions {
  return Object.fromEntries(
    ADMIN_MODULES.map((module) => [module, level]),
  ) as AdminPermissions;
}

export function defaultAdminPermissions(role: AdminRole): AdminPermissions {
  if (role === "dirigeant") {
    return {
      dashboard: "read",
      companies: "read",
      finances: "read",
      users: "none",       // dirigeants n'ont pas accès aux utilisateurs
      audit: "read",
      reports: "read",
    };
  }
  return allAdminPermissions("manage");
}

function isModule(value: string): value is AdminModule {
  return (ADMIN_MODULES as readonly string[]).includes(value);
}

function isLevel(value: unknown): value is AdminPermissionLevel {
  return (
    typeof value === "string" &&
    (ADMIN_PERMISSION_LEVELS as readonly string[]).includes(value)
  );
}

export function parseAdminPermissions(
  value: unknown,
  role: AdminRole = "admin",
): AdminPermissions {
  const defaults = defaultAdminPermissions(role);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const permissions = { ...defaults };
  for (const [key, level] of Object.entries(value)) {
    if (isModule(key) && isLevel(level)) {
      permissions[key] = level;
    }
  }
  return permissions;
}

export function hasAdminPermission(
  permissions: AdminPermissions,
  module: AdminModule,
  required: AdminPermissionLevel = "read",
): boolean {
  return LEVEL_RANK[permissions[module]] >= LEVEL_RANK[required];
}

export function canReadAdminModule(
  permissions: AdminPermissions,
  module: AdminModule,
): boolean {
  return hasAdminPermission(permissions, module, "read");
}
