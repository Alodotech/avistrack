"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useAuthModal } from "./auth-modal-context";
import { GoogleSignInButton } from "./google-sign-in-button";

export function AuthModal() {
  const { isOpen, mode, openLogin, openSignup, closeModal } = useAuthModal();
  const modalRef = useRef<HTMLDivElement>(null);

  // Fermeture avec la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  // Verrouillage du scroll en arrière-plan
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isSignup = mode === "signup";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Arrière-plan avec flou */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Carte du modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-black/15 bg-white p-6 text-black shadow-lg sm:p-8"
      >
        {/* Bouton de fermeture */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
          aria-label="Fermer la boîte de dialogue"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* En-tête avec Logo AvisTrack */}
        <div className="flex flex-col items-center text-center">
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

          {/* Sélecteur d'onglet : Se connecter / Créer un compte */}
          <div className="mt-2 mb-5 flex w-full rounded-md bg-gray-100 p-1">
            <button
              type="button"
              onClick={openLogin}
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded text-sm font-medium transition-colors ${
                !isSignup
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={openSignup}
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded text-sm font-medium transition-colors ${
                isSignup
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Créer mon compte
            </button>
          </div>

          <h2
            id="auth-modal-title"
            className="text-xl font-bold tracking-tight text-black"
          >
            {isSignup ? "Créer un compte entreprise" : "Connexion à votre espace"}
          </h2>

          <p
            className="mt-1.5 text-xs text-gray-600 leading-relaxed max-w-xs"
          >
            {isSignup
              ? "Rejoignez AvisTrack et commencez à récolter les avis de vos clients en un seul scan."
              : "Accédez à votre tableau de bord et à vos avis clients en un clic."}
          </p>
        </div>

        {/* Bouton Google 1-Clic */}
        <div className="mt-6 flex flex-col gap-4">
          <GoogleSignInButton
            label={isSignup ? "Continuer avec Google" : "Se connecter avec Google"}
          />
        </div>

        {/* Bascule secondaire entre Connexion et Inscription */}
        <div className="mt-6 border-t border-black/10 pt-4 text-center text-xs text-gray-600">
          {isSignup ? (
            <p>
              Vous avez déjà un compte ?{" "}
              <button
                type="button"
                onClick={openLogin}
                className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline"
              >
                Se connecter
              </button>
            </p>
          ) : (
            <p>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={openSignup}
                className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline"
              >
                Créer un compte
              </button>
            </p>
          )}
        </div>

        {/* Footer légal discret */}
        <p className="mt-6 text-center text-xs leading-tight text-gray-500">
          En continuant, vous acceptez les{" "}
          <a
            href="/mentions-legales"
            target="_blank"
            className="underline underline-offset-2 hover:text-black"
          >
            conditions d&apos;utilisation
          </a>{" "}
          d&apos;AvisTrack.
        </p>
      </div>
    </div>
  );
}
