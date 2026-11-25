"use client";

import dynamic from "next/dynamic";

const QrStudio = dynamic(
  () => import("@/components/company/qr-studio").then((m) => m.QrStudio),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[26rem] place-items-center rounded-lg border border-black/15 bg-white sm:h-[30rem] lg:h-[34rem]">
        <p className="text-sm text-gray-600">Génération de l&apos;affiche QR…</p>
      </div>
    ),
  },
);

export function QrStudioLoader({
  url,
  companyName,
  companyLogoUrl,
}: {
  url: string;
  companyName?: string;
  companyLogoUrl?: string | null;
}) {
  return (
    <QrStudio
      url={url}
      companyName={companyName}
      companyLogoUrl={companyLogoUrl ?? undefined}
    />
  );
}
