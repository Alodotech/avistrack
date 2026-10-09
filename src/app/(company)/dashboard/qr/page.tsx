import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountStateScreen } from "@/components/company/account-state-screen";
import { PageHeader } from "@/components/ui/panel";
import { requireCompany } from "@/server/auth/guards";
import { publicReviewUrl } from "@/server/services/qr";
import { QrStudioLoader } from "./qr-studio-loader";

export const metadata: Metadata = { title: "QR code" };

export default function QrPage() {
  return (
    <>
      <PageHeader
        title="QR code"
        description="Composez votre QR code : lien à encoder, ambiance et couleur, puis téléchargez-le pour l'impression."
      />
      <Suspense
        fallback={
          <p className="text-sm text-gray-600">Chargement du studio…</p>
        }
      >
        <QrContent />
      </Suspense>
    </>
  );
}

async function QrContent() {
  // L'identité vient de la session serveur : le lien encodé n'est jamais saisi.
  const company = await requireCompany();
  if (company.status !== "ACTIVE") {
    return <AccountStateScreen status={company.status} />;
  }

  return <QrStudioLoader url={publicReviewUrl(company.publicId)} />;
}
