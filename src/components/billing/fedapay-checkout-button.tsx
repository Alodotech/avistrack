"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createFedapayCheckoutAction,
  type FedapayCheckoutPeriod,
} from "@/server/actions/payments";

type FedapayCheckoutOptions = {
  public_key: string;
  environment: "sandbox" | "live";
  locale: "fr";
  transaction: {
    amount: number;
    description: string;
    custom_metadata: { avistrackToken: string };
  };
  customer: { email: string; firstname: string; lastname: string };
  onComplete: (result: unknown) => void;
};

declare global {
  interface Window {
    FedaPay?: {
      init: (options: FedapayCheckoutOptions) => { open: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadFedapayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout indisponible côté serveur."));
  }
  if (window.FedaPay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.fedapay.com/checkout.js?v=1.1.7";
      script.async = true;
      script.onload = () => {
        if (window.FedaPay) resolve();
        else {
          scriptPromise = null;
          reject(new Error("FedaPay Checkout n'a pas pu démarrer."));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Impossible de charger FedaPay Checkout."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function FedapayCheckoutButton({
  period,
  label,
}: {
  period: FedapayCheckoutPeriod;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function pay() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createFedapayCheckoutAction(period);
      if (!result.ok || !result.config) {
        setError(result.message ?? "Impossible de démarrer le paiement.");
        return;
      }
      try {
        await loadFedapayScript();
        if (!window.FedaPay) {
          throw new Error("FedaPay Checkout n'est pas disponible.");
        }
        const config = result.config;
        const widget = window.FedaPay.init({
          public_key: config.publicKey,
          environment: config.environment,
          locale: "fr",
          transaction: {
            amount: config.amount,
            description: config.description,
            custom_metadata: { avistrackToken: config.token },
          },
          customer: config.customer,
          onComplete: () => {
            setNotice("Paiement envoyé. L'abonnement sera activé après confirmation FedaPay.");
            router.refresh();
          },
        });
        widget.open();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible d'ouvrir le paiement FedaPay.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" disabled={pending} onClick={pay}>
        {pending ? "Ouverture…" : label}
      </Button>
      {notice ? <p className="text-sm text-gray-600">{notice}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
