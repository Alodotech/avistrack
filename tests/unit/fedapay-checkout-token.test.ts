import { describe, expect, it } from "vitest";
import {
  createFedapayCheckoutToken,
  verifyFedapayCheckoutToken,
} from "@/lib/fedapay-checkout-token";

const secret = "sk_live_test_secret";
const now = new Date("2026-11-23T12:00:00.000Z").getTime();
const payload = {
  companyId: "9e2d5d7f-3a0b-4c7d-9c5b-0f8a6b4e2d11",
  period: "monthly" as const,
  amount: 3500,
  nonce: "0c7f9a2e-5b41-4d38-8d2e-6a1f3b9c7d05",
  iat: now,
};

describe("jeton de checkout FedaPay", () => {
  it("valide un jeton émis par le serveur", () => {
    const token = createFedapayCheckoutToken(payload, secret);
    expect(verifyFedapayCheckoutToken(token, secret, now)).toEqual(payload);
  });

  it("rejette un jeton modifié", () => {
    const token = createFedapayCheckoutToken(payload, secret);
    const tampered = `${token.slice(0, -2)}aa`;
    expect(verifyFedapayCheckoutToken(tampered, secret, now)).toBeNull();
  });

  it("rejette un jeton périmé", () => {
    const token = createFedapayCheckoutToken(payload, secret);
    expect(
      verifyFedapayCheckoutToken(token, secret, now + 31 * 60 * 1000),
    ).toBeNull();
  });

  it("rejette un jeton signé avec une autre clé", () => {
    const token = createFedapayCheckoutToken(payload, secret);
    expect(verifyFedapayCheckoutToken(token, "autre_secret", now)).toBeNull();
  });
});
