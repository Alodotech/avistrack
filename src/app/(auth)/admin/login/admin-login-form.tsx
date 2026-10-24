"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 rounded-3xl border border-black/10 bg-white p-7 text-black shadow-xl sm:p-10">
      <header className="flex flex-col items-center text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <Image
            src="/assets/logoavistrack.png"
            alt="Logo AvisTrack"
            width={36}
            height={30}
            className="h-8 w-auto object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-black">
            AvisTrack
          </span>
        </div>

        <span className="mb-3 inline-block rounded-md bg-accent px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wider text-white uppercase shadow-xs">
          Administration
        </span>

        <h1 className="text-xl font-bold tracking-tight text-black">
          Espace Administration
        </h1>
        <p className="mt-1.5 text-xs text-gray-600">
          Accès sécurisé réservé aux administrateurs AvisTrack.
        </p>
      </header>

      {error === "unauthorized" && (
        <div
          role="alert"
          className="rounded-xl border border-red/20 bg-red/10 p-3 text-center text-xs font-semibold text-red"
        >
          Ce compte Google ne dispose pas des droits d&apos;administration.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <GoogleSignInButton
          label="Continuer avec Google"
          next="/admin"
        />
      </div>

      <p className="border-t border-black/10 pt-4 text-center text-xs text-gray-500">
        <Link
          href="/"
          className="font-semibold text-black underline-offset-4 hover:underline"
        >
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
