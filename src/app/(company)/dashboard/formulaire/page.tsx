import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { PageHeader } from "@/components/ui/panel";
import { requireCompany } from "@/server/auth/guards";
import { getReviewFormConfig } from "@/server/repositories/form-repository";
import { FormStudio } from "./form-studio";

export const metadata: Metadata = { title: "Studio du formulaire" };

export default function FormStudioPage() {
  return (
    <>
      <PageHeader
        title="Studio du formulaire"
        description="Personnalisez le formulaire que vos clients remplissent après avoir scanné votre QR code."
      />
      <Suspense
        fallback={<p className="text-sm text-gray-600">Chargement du formulaire…</p>}
      >
        <FormStudioContent />
      </Suspense>
    </>
  );
}

async function FormStudioContent() {
  const company = await requireCompany();
  if (company.status !== "ACTIVE") {
    return <AccountStateScreen status={company.status} />;
  }

  const config = await getReviewFormConfig(company.id);
  return (
    <FormStudio
      // Remonte le studio avec les valeurs enregistrées après une mise à jour.
      key={JSON.stringify(config)}
      config={config}
      companyName={company.name}
    />
  );
}
