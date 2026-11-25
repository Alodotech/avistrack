import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export function verifyFeexPayWebhookSignature(input: {
  rawBody: string;
  timestamp: string;
  deliveryId: string;
  signature: string;
  secret: string;
  now?: number;
}): boolean {
  if (!input.timestamp || !input.deliveryId || !input.secret) return false;

  const timestamp = Number(input.timestamp);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return false;

  const currentTime = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(currentTime - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.deliveryId}.${input.rawBody}`)
    .digest();

  return input.signature.split(",").some((part) => {
    const match = /^v1=([a-f0-9]{64})$/i.exec(part.trim());
    if (!match) return false;

    const provided = Buffer.from(match[1], "hex");
    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  });
}
