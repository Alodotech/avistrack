import { Transaction } from "fedapay";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSubscriptionPrice } from "@/lib/pricing";
import {
  activatePaidSubscription,
  hasProcessedFedapayEvent,
  markFedapayEventProcessed,
} from "@/server/repositories/subscription-repository";
import {
  configureFedapay,
  FEDAPAY_PROVIDER,
  readFedapayCheckoutPayload,
  verifyFedapayWebhook,
} from "@/server/fedapay";

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

function readEvent(payload: unknown): {
  id: string | null;
  name: string | null;
  transaction: RecordValue | null;
} {
  const event = asRecord(payload);
  if (!event) return { id: null, name: null, transaction: null };
  const data = asRecord(event.data);
  const object = asRecord(data?.object);
  return {
    id: asString(event.id),
    name: asString(event.name) ?? asString(event.type),
    transaction:
      object ?? asRecord(event.entity) ?? data ?? asRecord(event.object) ?? event,
  };
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-fedapay-signature");
  if (!signature) {
    return new Response("Signature FedaPay manquante.", { status: 400 });
  }

  let verified: unknown;
  try {
    verified = verifyFedapayWebhook(await request.text(), signature);
  } catch {
    return new Response("Signature FedaPay invalide.", { status: 400 });
  }

  const event = readEvent(verified);
  if (!event.name || event.name !== "transaction.approved") {
    return NextResponse.json({ received: true });
  }
  if (!event.transaction) {
    return new Response("Transaction introuvable dans l'événement.", {
      status: 400,
    });
  }

  const transactionId =
    asString(event.transaction.id) ??
    asString(event.transaction.transaction_id);
  if (!transactionId) {
    return new Response("Identifiant de transaction manquant.", { status: 400 });
  }

  const fallbackRef = asString(event.transaction.reference) ?? transactionId;
  const eventId = event.id ?? `tx:${fallbackRef}`;
  try {
    if (await hasProcessedFedapayEvent(eventId)) {
      return NextResponse.json({ received: true });
    }
  } catch {
    return new Response("Impossible de vérifier l'événement FedaPay.", {
      status: 500,
    });
  }

  try {
    configureFedapay();
    const retrieved = await Transaction.retrieve(transactionId);
    const transaction = asRecord(retrieved) ?? event.transaction;
    const status = asString(transaction.status)?.toLowerCase();
    if (status !== "approved" && status !== "paid") {
      return NextResponse.json({ received: true, ignored: status ?? "unknown" });
    }

    const amount = Number(transaction.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return new Response("Montant de transaction invalide.", { status: 400 });
    }
    const currency = asRecord(transaction.currency);
    const currencyIso = currency ? asString(currency.iso) : null;
    if (currencyIso && currencyIso.toUpperCase() !== "XOF") {
      return new Response("Devise de transaction inattendue.", { status: 400 });
    }

    const metadata =
      asRecord(transaction.custom_metadata) ??
      asRecord(transaction.metadata) ??
      {};
    const checkout = readFedapayCheckoutPayload(metadata);
    if (!checkout || checkout.amount !== amount) {
      return new Response("Métadonnées de paiement invalides.", { status: 400 });
    }
    if (getSubscriptionPrice(checkout.period) !== amount) {
      return new Response("Montant d'abonnement incohérent.", { status: 400 });
    }

    const providerRef = asString(transaction.reference) ?? fallbackRef;
    await activatePaidSubscription({
      companyId: checkout.companyId,
      plan: "pro",
      period: checkout.period,
      amount,
      provider: FEDAPAY_PROVIDER,
      providerRef,
    });

    await markFedapayEventProcessed(eventId, event.name);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/abonnement");
    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Erreur de paiement FedaPay.",
      { status: 500 },
    );
  }
}
