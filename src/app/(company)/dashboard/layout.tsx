import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppShell, ShellIdentity } from "@/components/ui/app-shell";
import { InactivityHandler } from "@/components/admin/InactivityHandler";
import { buttonClass } from "@/components/ui/button";
import {
  CreditCardIcon,
  DashboardIcon,
  FormIcon,
  MessageIcon,
  QrIcon,
  UserIcon,
} from "@/components/ui/icons";
import { getCurrentCompany } from "@/server/auth/guards";
import { getCompanySubscriptionView } from "@/server/services/company-access";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: <DashboardIcon />,
    exact: true,
  },
  { href: "/dashboard/qr", label: "QR code", icon: <QrIcon /> },
  { href: "/dashboard/formulaire", label: "Studio du formulaire", icon: <FormIcon /> },
  { href: "/dashboard/remarques", label: "Remarques", icon: <MessageIcon /> },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: <CreditCardIcon /> },
  { href: "/dashboard/profil", label: "Profil", icon: <UserIcon /> },
];

async function CompanyIdentity() {
  await connection();
  const company = await getCurrentCompany();
  if (!company) return null;
  const subscription = await getCompanySubscriptionView(company, new Date());
  return (
    <ShellIdentity
      label="Connecté en tant que"
      value={company.name}
      secondary={company.email}
      logoUrl={company.logoUrl}
      planLabel={subscription?.view.modeLabel ?? "Aucune offre"}
    />
  );
}

/**
 * Explique pourquoi l'accès est fermé et dirige vers l'étape de souscription.
 */
async function SubscriptionNotice() {
  await connection();
  const company = await getCurrentCompany();
  if (!company) return null;
  const subscription = await getCompanySubscriptionView(company, new Date());
  if (
    subscription &&
    !subscription.view.isExpired &&
    subscription.view.status !== "SUSPENDED"
  ) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red bg-red/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="font-semibold text-red">
        {!subscription
          ? "Aucun abonnement n'est encore actif."
          : subscription.view.isExpired
            ? "Votre abonnement a expiré."
            : "Votre abonnement est suspendu."}{" "}
        Le tableau de bord sera accessible après confirmation du paiement ou
        attribution d&apos;un essai par l&apos;équipe AvisTrack.
      </p>
      <Link
        href={!subscription ? "/onboarding" : "/dashboard/abonnement"}
        className={buttonClass("primary", "w-full sm:w-auto", "sm")}
      >
        {!subscription ? "Choisir une offre" : "Renouveler mon abonnement"}
      </Link>
    </div>
  );
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
      <InactivityHandler redirectTo="/?auth=login">
        <Suspense fallback={null}>
          <SubscriptionNotice />
        </Suspense>
        {children}
      </InactivityHandler>
    </AppShell>
  );
}
