import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyFeexPayWebhookSignature } from "@/lib/feexpay-webhook-signature";

const secret = "feexpay-webhook-secret";
const deliveryId = "delivery-123";
const rawBody = '{"reference":"ref-456","status":"SUCCESSFUL","amount":3500}';
const now = Date.parse("2026-11-24T11:00:00.000Z");
const timestamp = String(Math.floor(now / 1000));

function signatureFor(body: string, sentAt = timestamp): string {
  const digest = createHmac("sha256", secret)
    .update(`${sentAt}.${deliveryId}.${body}`)
    .digest("hex");
  return `v1=${digest}`;
}

describe("signature du webhook FeexPay", () => {
  it("accepte une signature valide à jour", () => {
    expect(
      verifyFeexPayWebhookSignature({
        rawBody,
        timestamp,
        deliveryId,
        signature: signatureFor(rawBody),
        secret,
        now,
      }),
    ).toBe(true);
  });

  it("accepte une signature valide parmi plusieurs versions", () => {
    expect(
      verifyFeexPayWebhookSignature({
        rawBody,
        timestamp,
        deliveryId,
        signature: `v1=${"0".repeat(64)}, ${signatureFor(rawBody)}`,
        secret,
        now,
      }),
    ).toBe(true);
  });

  it("rejette un corps modifié et une requête trop ancienne", () => {
    expect(
      verifyFeexPayWebhookSignature({
        rawBody: `${rawBody} `,
        timestamp,
        deliveryId,
        signature: signatureFor(rawBody),
        secret,
        now,
      }),
    ).toBe(false);
    expect(
      verifyFeexPayWebhookSignature({
        rawBody,
        timestamp,
        deliveryId,
        signature: signatureFor(rawBody),
        secret,
        now: now + 6 * 60 * 1000,
      }),
    ).toBe(false);
  });
});
