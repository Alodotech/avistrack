"use client";

import dynamic from "next/dynamic";

const QrStudio = dynamic(
  () => import("@/components/company/qr-studio").then((m) => m.QrStudio),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[26rem] place-items-center rounded-lg border border-black/15 bg-white sm:h-[30rem] lg:h-[34rem]">
        <p className="text-sm text-gray-600">Chargement du studio…</p>
      </div>
    ),
  },
);

/** Point d'entrée client du studio QR (three.js chargé en différé). */
export function QrStudioLoader({ url }: { url: string }) {
  return <QrStudio url={url} />;
}
