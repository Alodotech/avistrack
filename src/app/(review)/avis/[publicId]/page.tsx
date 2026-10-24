import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPublicCompanyByPublicId } from "@/server/repositories/company-repository";
import { getPublicReviewFormConfig } from "@/server/repositories/form-repository";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "Votre avis",
  description: "Partagez votre expérience en quelques secondes.",
  /*
   * La page est atteinte par QR code ou lien direct : elle n'a pas vocation à
   * être indexée. `robots.txt` l'exclut déjà de l'exploration ; on ajoute
   * l'`noindex` au cas où le robot passerait par un lien externe.
   */
  robots: { index: false, follow: false },
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
  const company = await findPublicCompanyByPublicId(decodeURIComponent(publicId));
  if (!company) notFound();

  if (company.status !== "ACTIVE") {
    return (
      <UnavailableScreen
        title="Formulaire indisponible"
        message="Ce commerce ne collecte pas d'avis pour le moment. Merci de votre compréhension."
      />
    );
  }

  const config = await getPublicReviewFormConfig(company.publicId);

  /*
   * La date maximale est calculée ici, côté serveur : la calculer dans le
   * composant client provoquerait un écart d'hydratation entre la date du
   * serveur et celle du navigateur.
   */
  const maxDate = new Date().toISOString().slice(0, 10);

  return (
    <ReviewForm
      companyName={company.name}
      publicId={company.publicId}
      config={config}
      maxDate={maxDate}
    />
  );
}
