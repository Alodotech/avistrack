import { describe, expect, it } from "vitest";
import type { CompanySubscription } from "@/server/domain";
import { isSubscriptionAccessBlocked } from "@/lib/subscription";

const now = new Date("2026-11-24T12:00:00.000Z");

function subscription(
  overrides: Partial<CompanySubscription> = {},
): CompanySubscription {
  return {
    companyId: "11111111-1111-4111-8111-111111111111",
    plan: "pro",
    period: "monthly",
    amount: 3500,
    status: "ACTIVE",
    startedAt: new Date("2026-11-01T12:00:00.000Z"),
    currentPeriodEnd: new Date("2026-12-01T12:00:00.000Z"),
    updatedAt: new Date("2026-11-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("isSubscriptionAccessBlocked", () => {
  it("blocks companies without a subscription", () => {
    expect(isSubscriptionAccessBlocked(null, now)).toBe(true);
  });

  it("allows active paid subscriptions and manually assigned trials", () => {
    expect(isSubscriptionAccessBlocked(subscription(), now)).toBe(false);
    expect(
      isSubscriptionAccessBlocked(
        subscription({
          plan: "trial",
          period: "trial",
          amount: 0,
          status: "TRIALING",
          currentPeriodEnd: new Date("2026-12-08T12:00:00.000Z"),
          trialEndDate: new Date("2026-12-08T12:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("blocks expired and suspended subscriptions", () => {
    expect(
      isSubscriptionAccessBlocked(
        subscription({
          currentPeriodEnd: new Date("2026-11-20T12:00:00.000Z"),
        }),
        now,
      ),
    ).toBe(true);
    expect(
      isSubscriptionAccessBlocked(
        subscription({ status: "SUSPENDED" }),
        now,
      ),
    ).toBe(true);
  });
});
