import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const checkoutPayloadSchema = z.object({
  companyId: z.string().uuid(),
  period: z.enum(["monthly", "annual"]),
  amount: z.number().int().positive(),
  nonce: z.string().min(16),
  iat: z.number().int().positive(),
});

export type FedapayCheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

const TOKEN_TTL_MS = 30 * 60 * 1000;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createFedapayCheckoutToken(
  payload: FedapayCheckoutPayload,
  secret: string,
): string {
  const parsed = checkoutPayloadSchema.parse(payload);
  const body = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyFedapayCheckoutToken(
  token: unknown,
  secret: string,
  now = Date.now(),
): FedapayCheckoutPayload | null {
  if (typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const parsed = checkoutPayloadSchema.safeParse(decoded);
  if (!parsed.success) return null;
  if (
    parsed.data.iat > now + 60_000 ||
    now - parsed.data.iat > TOKEN_TTL_MS
  ) {
    return null;
  }
  return parsed.data;
}
