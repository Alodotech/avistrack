import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/panel";
import { requireCompany } from "@/server/auth/guards";
import { publicReviewUrl } from "@/server/services/qr";
import { QrStudioLoader } from "./qr-studio-loader";
import { markQrGenerated } from "@/server/repositories/company-repository";

export const metadata: Metadata = { title: "QR code" };

export default async function QrPage() {
  const company = await requireCompany();
  await markQrGenerated(company.id);

  return (
    <>
      <PageHeader
        title="QR code"
        description="Créez une affiche à votre image et partagez votre fiche d'avis."
      />
      <Suspense
        fallback={<p className="text-sm text-gray-600">Génération du QR code…</p>}
      >
        <QrStudioLoader
          url={publicReviewUrl(company.publicId)}
          companyName={company.name}
        />
      </Suspense>
    </>
  );
}