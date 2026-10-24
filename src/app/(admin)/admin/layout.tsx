import { Suspense } from "react";
import { AppShell, ShellIdentity } from "@/components/ui/app-shell";
import {
  BuildingIcon,
  DashboardIcon,
  JournalIcon,
} from "@/components/ui/icons";
import { getCurrentAdmin } from "@/server/auth/guards";
import { InactivityHandler } from "@/components/admin/InactivityHandler";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: <DashboardIcon />, exact: true },
  { href: "/admin/entreprises", label: "Entreprises", icon: <BuildingIcon /> },
  { href: "/admin/journal", label: "Journal d'audit", icon: <JournalIcon /> },
];

async function AdminIdentity() {
  const admin = await getCurrentAdmin();
  return admin ? (
    <ShellIdentity label="Administrateur" value={admin.email} />
  ) : null;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell
      area="admin"
      homeHref="/admin"
      items={NAV}
      identity={
        <Suspense fallback={null}>
          <AdminIdentity />
        </Suspense>
      }
    >
      <InactivityHandler redirectTo="/admin/login">
        {children}
      </InactivityHandler>
    </AppShell>
  );
}
