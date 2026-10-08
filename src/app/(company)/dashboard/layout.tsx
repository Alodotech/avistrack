import { Suspense } from "react";
import { AppShell, ShellIdentity } from "@/components/ui/app-shell";
import { DashboardIcon, UserIcon } from "@/components/ui/icons";
import { getCurrentCompany } from "@/server/auth/guards";

const NAV = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: <DashboardIcon />,
    exact: true,
  },
  { href: "/dashboard/profil", label: "Profil", icon: <UserIcon /> },
];

async function CompanyIdentity() {
  const company = await getCurrentCompany();
  return company ? (
    <ShellIdentity label="Connecté en tant que" value={company.name} />
  ) : null;
}

export default function CompanyLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <AppShell
      area="company"
      homeHref="/dashboard"
      items={NAV}
      identity={
        <Suspense fallback={null}>
          <CompanyIdentity />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
