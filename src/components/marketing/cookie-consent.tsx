"use client";

import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { useSyncExternalStore } from "react";

type Consent = "accepted" | "rejected" | null;
type ConsentSnapshot = Consent | "pending";
const CONSENT_KEY = "avistrack-analytics-consent";
const CONSENT_CHANGE_EVENT = "avistrack:consent-change";

function isConsent(value: string | null): value is Exclude<Consent, null> {
  return value === "accepted" || value === "rejected";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): Consent {
  const saved = localStorage.getItem(CONSENT_KEY);
  return isConsent(saved) ? saved : null;
}

function getServerSnapshot(): ConsentSnapshot {
  return "pending";
}

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function chooseConsent(value: Exclude<Consent, null>) {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  }

  return (
    <>
      {consent === "accepted" && process.env.NODE_ENV === "production" ? (
        <Analytics />
      ) : null}
      {consent === null ? (
        <aside
          aria-label="Préférences de confidentialité"
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-black/15 bg-white p-4 text-black shadow-xl sm:inset-x-6 sm:bottom-6 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="text-sm leading-5">
            <p className="font-semibold">Vos préférences de confidentialité</p>
            <p className="mt-1 text-xs text-gray-600">
              Les cookies nécessaires assurent le fonctionnement du site. Avec
              votre accord, des statistiques de fréquentation sont mesurées
              de manière agrégée. Vous pouvez modifier votre choix à tout moment.
              <Link
                href="/confidentialite"
                className="ml-1 font-semibold text-black underline underline-offset-2"
              >
                En savoir plus
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row">
            <button
              type="button"
              onClick={() => chooseConsent("rejected")}
              className="min-h-11 rounded-md border border-black/20 px-3 text-xs font-semibold hover:bg-gray-100"
            >
              Refuser
            </button>
            <button
              type="button"
              onClick={() => chooseConsent("accepted")}
              className="min-h-11 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-deep"
            >
              Accepter la mesure
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem(CONSENT_KEY);
        window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
      }}
      className="inline-flex min-h-11 items-center text-sm text-white/65 underline-offset-4 transition-colors hover:text-white hover:underline"
    >
      Préférences cookies
    </button>
  );
}
