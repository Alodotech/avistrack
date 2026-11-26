import { describe, expect, it } from "vitest";
import { isLocalPaymentSimulationEnabled } from "@/lib/payment-simulation";

describe("simulation locale du paiement", () => {
  it("est activée uniquement hors production avec l'option explicite", () => {
    expect(isLocalPaymentSimulationEnabled("development", "true")).toBe(true);
    expect(isLocalPaymentSimulationEnabled("test", "true")).toBe(true);
  });

  it("reste désactivée en production ou sans activation explicite", () => {
    expect(isLocalPaymentSimulationEnabled("production", "true")).toBe(false);
    expect(isLocalPaymentSimulationEnabled("development", "false")).toBe(false);
    expect(isLocalPaymentSimulationEnabled("development", undefined)).toBe(false);
  });
});
