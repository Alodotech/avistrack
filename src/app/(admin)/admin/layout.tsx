import { Suspense } from "react";
import { AppShell, ShellIdentity } from "@/components/ui/app-shell";
import { BuildingIcon, JournalIcon } from "@/components/ui/icons";
import { getCurrentAdmin } from "@/server/auth/guards";

const NAV = [
  { href: "/admin", label: "Entreprises", icon: <BuildingIcon />, exact: true },
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
      {children}
    </AppShell>
  );
}
