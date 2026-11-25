import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSubscriptionPrice } from "@/lib/pricing";
import { verifyFeexPayWebhookSignature } from "@/lib/feexpay-webhook-signature";
import {
  activatePaidSubscription,
  findFeexPayPayment,
  hasProcessedFeexPayEvent,
  markFeexPayEventProcessed,
  markFeexPayPaymentFailed,
} from "@/server/repositories/subscription-repository";
import { FEEXPAY_PROVIDER, getFeexPayWebhookSecret } from "@/server/feexpay";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readTransaction(payload: unknown): RecordValue | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root.data);
  return (
    asRecord(data?.transaction) ??
    asRecord(data?.object) ??
    asRecord(root.transaction) ??
    data ??
    root
  );
}

export async function POST(request: Request) {
  const timestamp = request.headers.get("x-feexpay-timestamp") ?? "";
  const deliveryId = request.headers.get("x-feexpay-delivery-id") ?? "";
  const eventName = request.headers.get("x-feexpay-event") ?? "";
  const signature = request.headers.get("x-feexpay-signature") ?? "";
  if (!timestamp || !deliveryId || !eventName || !signature) {
    return new Response("En-têtes du webhook FeexPay manquants.", {
      status: 400,
    });
  }

  const rawBody = await request.text();
  let webhookSecret: string;
  try {
    webhookSecret = getFeexPayWebhookSecret();
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Webhook FeexPay non configuré.",
      { status: 500 },
    );
  }
  if (
    !verifyFeexPayWebhookSignature({
      rawBody,
      timestamp,
      deliveryId,
      signature,
      secret: webhookSecret,
    })
  ) {
    return new Response("Signature du webhook FeexPay invalide.", {
      status: 400,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Corps du webhook FeexPay invalide.", { status: 400 });
  }

  try {
    if (await hasProcessedFeexPayEvent(deliveryId)) {
      return NextResponse.json({ received: true });
    }

    if (
      eventName !== "transaction.successful" &&
      eventName !== "transaction.failed"
    ) {
      return NextResponse.json({ received: true, ignored: eventName });
    }

    const transaction = readTransaction(payload);
    const providerRef = asString(transaction?.reference);
    if (!providerRef) {
      return new Response("Référence de transaction FeexPay manquante.", {
        status: 400,
      });
    }

    const payment = await findFeexPayPayment(providerRef);
    if (!payment) {
      return new Response("Paiement AvisTrack introuvable.", { status: 500 });
    }

    const status = asString(transaction?.status)?.toUpperCase();
    if (eventName === "transaction.failed") {
      if (status !== "FAILED") {
        return new Response("Statut d'échec FeexPay incohérent.", {
          status: 400,
        });
      }
      await markFeexPayPaymentFailed(providerRef);
      await markFeexPayEventProcessed(deliveryId, eventName);
      revalidatePath("/dashboard/abonnement");
      return NextResponse.json({ received: true, failed: true });
    }

    const amount = Number(transaction?.amount);
    if (
      status !== "SUCCESSFUL" ||
      !Number.isInteger(amount) ||
      amount !== payment.amount ||
      (payment.period !== "monthly" && payment.period !== "annual") ||
      getSubscriptionPrice(payment.period) !== amount
    ) {
      return new Response("Données de paiement FeexPay incohérentes.", {
        status: 400,
      });
    }

    await activatePaidSubscription({
      companyId: payment.companyId,
      plan: "pro",
      period: payment.period,
      amount,
      provider: FEEXPAY_PROVIDER,
      providerRef,
    });
    await markFeexPayEventProcessed(deliveryId, eventName);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/abonnement");
    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Erreur de traitement FeexPay.",
      { status: 500 },
    );
  }
}
