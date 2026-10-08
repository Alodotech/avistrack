import { Suspense } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { getCurrentCompany } from "@/server/auth/guards";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/dashboard/profil", label: "Profil" },
];

async function CompanyName() {
  const company = await getCurrentCompany();
  return company ? <span className="font-semibold">{company.name}</span> : null;
}

export default function CompanyLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <>
      <AppHeader
        area="company"
        homeHref="/dashboard"
        items={NAV}
        identity={
          <Suspense fallback={null}>
            <CompanyName />
          </Suspense>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        {children}
      </main>
    </>
  );
}
