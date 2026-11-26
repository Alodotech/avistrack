import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppShell, ShellIdentity } from "@/components/ui/app-shell";
import {
  BuildingIcon,
  CreditCardIcon,
  DashboardIcon,
  JournalIcon,
  TrendIcon,
  UserIcon,
} from "@/components/ui/icons";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getCurrentAdmin } from "@/server/auth/guards";
import type { AdminModule } from "@/server/domain";
import { InactivityHandler } from "@/components/admin/InactivityHandler";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s — Administration AvisTrack" },
  robots: { index: false, follow: false, nocache: true },
};

const NAV: {
  href: string;
  label: string;
  icon: ReactNode;
  module: AdminModule;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Tableau de bord", icon: <DashboardIcon />, module: "dashboard", exact: true },
  { href: "/admin/entreprises", label: "Entreprises", icon: <BuildingIcon />, module: "companies" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: <UserIcon />, module: "users" },
  { href: "/admin/finances", label: "Finances", icon: <CreditCardIcon />, module: "finances" },
  { href: "/admin/journal", label: "Journal d'audit", icon: <JournalIcon />, module: "audit" },
  { href: "/admin/rapports", label: "Rapports", icon: <TrendIcon />, module: "reports" },
];

export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await connection();
  const admin = await getCurrentAdmin();
  const visibleNav = admin
    ? NAV.filter((item) => hasAdminPermission(admin.permissions, item.module))
    : [];

  return (
    <AppShell
      area="admin"
      homeHref="/admin"
      items={visibleNav}
      identity={
        admin ? (
          <ShellIdentity
            label={
              admin.role === "dirigeant"
                ? "Dirigeant AvisTrack"
                : "Administrateur"
            }
            value={admin.email}
          />
        ) : null
      }
    >
      <InactivityHandler redirectTo="/?auth=login">
        {children}
      </InactivityHandler>
    </AppShell>
  );
}
