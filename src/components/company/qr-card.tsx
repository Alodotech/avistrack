import { buttonClass } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import { CopyLinkButton } from "./copy-link-button";

/** DE-01 et DE-02 : QR code, lien public, copie et téléchargements. */
export function QrCard({ publicUrl }: { publicUrl: string }) {
  return (
    <Panel
      id="qr-code"
      title="Votre QR code"
      description="Imprimez-le et affichez-le en point de vente : vos clients le scannent pour laisser un avis, sans créer de compte."
    >
      <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-center">
        {/* Image servie par une route authentifiée : next/image n'apporterait rien ici. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/company/qr?format=svg"
          alt="QR code menant à votre formulaire d'avis"
          width={208}
          height={208}
          className="size-52 shrink-0 self-center rounded-md border border-black/15 bg-white p-2"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="public-link" className="text-sm font-semibold">
              Lien public du formulaire
            </label>
            <div className="flex flex-col gap-2 2xl:flex-row">
              <input
                id="public-link"
                readOnly
                value={publicUrl}
                className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-black/30 bg-gray-100 px-3 font-mono text-sm"
              />
              <CopyLinkButton value={publicUrl} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Télécharger pour impression</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/company/qr?format=png&download"
                className={buttonClass("primary")}
              >
                <DownloadIcon />
                PNG haute définition
              </a>
              <a
                href="/api/company/qr?format=svg&download"
                className={buttonClass("secondary")}
              >
                <DownloadIcon />
                SVG vectoriel
              </a>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Téléchargez le QR code en PNG pour l&apos;impression papier, ou en SVG pour une utilisation numérique (site web, réseaux sociaux).
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
