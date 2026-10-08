import { Suspense } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { getCurrentAdmin } from "@/server/auth/guards";

const NAV = [
  { href: "/admin", label: "Entreprises" },
  { href: "/admin/journal", label: "Journal d'audit" },
];

async function AdminIdentity() {
  const admin = await getCurrentAdmin();
  return admin ? <span>{admin.email}</span> : null;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AppHeader
        area="admin"
        homeHref="/admin"
        items={NAV}
        identity={
          <Suspense fallback={null}>
            <AdminIdentity />
          </Suspense>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        {children}
      </main>
    </>
  );
}
