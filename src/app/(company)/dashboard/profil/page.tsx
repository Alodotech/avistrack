import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { requireCompany } from "@/server/auth/guards";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Profil de l&apos;entreprise</h1>
      <Suspense
        fallback={<p className="text-sm text-gray-600">Chargement du profil…</p>}
      >
        <ProfileContent />
      </Suspense>
    </>
  );
}

/** DE-08. Le changement de mot de passe sera ajouté avec le module d'authentification. */
async function ProfileContent() {
  const company = await requireCompany();
  if (company.status !== "ACTIVE") {
    return <AccountStateScreen status={company.status} />;
  }

  return (
    <>
      <dl className="flex flex-col gap-1 text-sm">
        <dt className="font-semibold">Adresse e-mail de connexion</dt>
        <dd className="text-gray-600">{company.email}</dd>
      </dl>
      <ProfileForm
        // Remonte le formulaire avec les valeurs enregistrées après une mise à jour.
        key={`${company.name}|${company.phone}`}
        name={company.name}
        phone={company.phone}
      />
    </>
  );
}
