import { buttonClass } from "@/components/ui/button";
import { CopyLinkButton } from "./copy-link-button";

/** DE-01 et DE-02 : QR code, lien public, copie et téléchargements. */
export function QrCard({ publicUrl }: { publicUrl: string }) {
  return (
    <section
      aria-labelledby="qr-title"
      className="flex flex-col gap-5 rounded border border-black/15 p-5 sm:flex-row"
    >
      {/* Image servie par une route authentifiée : next/image n'apporterait rien ici. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/api/company/qr?format=svg"
        alt="QR code menant à votre formulaire d'avis"
        width={176}
        height={176}
        className="size-44 shrink-0 self-center border border-black/15 sm:self-start"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="qr-title" className="text-lg font-semibold">
            Votre QR code
          </h2>
          <p className="text-sm text-gray-600">
            Imprimez-le et affichez-le en point de vente : vos clients le
            scannent pour laisser un avis, sans créer de compte.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="public-link" className="text-sm font-semibold">
            Lien public du formulaire
          </label>
          <input
            id="public-link"
            readOnly
            value={publicUrl}
            className="w-full rounded border border-black/30 bg-gray-100 px-3 py-2 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <CopyLinkButton value={publicUrl} />
          <a
            href="/api/company/qr?format=png&download"
            className={buttonClass("primary")}
          >
            Télécharger en PNG
          </a>
          <a
            href="/api/company/qr?format=svg&download"
            className={buttonClass("secondary")}
          >
            Télécharger en SVG
          </a>
        </div>
      </div>
    </section>
  );
}
