import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCompanyByPublicId } from "@/server/repositories/company-repository";
import { getReviewFormConfig } from "@/server/repositories/form-repository";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "Votre avis",
  description: "Partagez votre expérience en quelques secondes.",
};

function UnavailableScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-black/15 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
    </div>
  );
}

export default async function ReviewPage({
  params,
}: PageProps<"/avis/[publicId]">) {
  const { publicId } = await params;
  const company = await findCompanyByPublicId(decodeURIComponent(publicId));
  if (!company) notFound();

  if (company.status !== "ACTIVE") {
    return (
      <UnavailableScreen
        title="Formulaire indisponible"
        message="Ce commerce ne collecte pas d'avis pour le moment. Merci de votre compréhension."
      />
    );
  }

  const config = await getReviewFormConfig(company.id);

  return <ReviewForm companyName={company.name} publicId={company.publicId} config={config} />;
}
