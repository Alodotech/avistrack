import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { PageHeader, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { requireCompany } from "@/server/auth/guards";
import { publicReviewUrl } from "@/server/services/qr";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profil de l'entreprise"
        description="Les informations affichées à vos clients et celles de votre compte."
      />
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

  const account = [
    { term: "Adresse e-mail de connexion", value: company.email },
    { term: "Statut du compte", value: <StatusBadge status={company.status} /> },
    { term: "Inscrite le", value: formatDate(company.createdAt) },
    {
      term: "Lien public du formulaire",
      value: (
        <span className="font-mono break-all">
          {publicReviewUrl(company.publicId)}
        </span>
      ),
    },
  ];

  return (
    <div className="grid items-start gap-6 lg:gap-8 xl:grid-cols-2">
      <Panel
        id="informations"
        title="Informations"
        description="Le nom est affiché à vos clients en tête du formulaire d'avis."
      >
        <ProfileForm
          // Remonte le formulaire avec les valeurs enregistrées après une mise à jour.
          key={`${company.name}|${company.phone}`}
          name={company.name}
          phone={company.phone}
        />
      </Panel>

      <Panel
        id="compte"
        title="Compte"
        description="Ces informations ne sont pas modifiables ici."
        flush
      >
        <dl className="flex flex-col">
          {account.map(({ term, value }) => (
            <div
              key={term}
              className="grid gap-1 border-t border-black/10 px-5 py-4 text-sm first:border-t-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6 lg:px-6"
            >
              <dt className="font-semibold">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
