"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type {
  FeexPayOperator,
  FeexPayPaymentMethod,
} from "@/lib/feexpay";
import { createFeexPayCheckoutAction } from "@/server/actions/payments";

export function FeexPayCheckoutButton({
  period,
  method,
  phone,
  operator,
  city,
  zip,
  firstName,
  lastName,
}: {
  period: "monthly" | "annual";
  method: FeexPayPaymentMethod;
  phone: string;
  operator?: FeexPayOperator;
  city: string;
  zip: string;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function pay() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createFeexPayCheckoutAction(
        period,
        method,
        phone,
        operator,
        { city, zip, firstName, lastName },
      );
      if (!result.ok) {
        setError(result.message ?? "Impossible de démarrer le paiement.");
        return;
      }
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setNotice(result.notice ?? "Demande de paiement envoyée à FeexPay.");
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={pending || !phone.trim()}
        onClick={pay}
      >
        {pending ? "Préparation…" : "Continuer avec FeexPay"}
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
