"use client";

import Link from "next/link";
import Image from "next/image";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function OnboardingForm() {
  return (
    <div className="flex flex-col gap-7 rounded-3xl border border-black/10 bg-white p-7 sm:p-10 text-black shadow-xl max-w-md mx-auto w-full">
      <header className="flex flex-col items-center text-center">
        <div className="mb-4 flex items-center justify-center gap-2.5">
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
        <h1 className="text-xl font-bold tracking-tight text-black">
          Créer mon compte
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Votre QR code et votre tableau de bord prêts en 1 clic avec votre compte Google.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <GoogleSignInButton label="Continuer avec Google" />
      </div>

      <div className="border-t border-black/10 pt-5 text-center text-sm text-gray-600">
        <p>
          Vous avez déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-bold text-accent hover:underline"
          >
            Se connecter
          </Link>
        </p>
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
