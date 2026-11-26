import { describe, expect, it } from "vitest";
import { validateReviewerIdentity } from "@/lib/reviewer-identity";

describe("validateReviewerIdentity", () => {
  it("requires the name, country-specific phone, and email for an identified reviewer", () => {
    const result = validateReviewerIdentity({
      firstName: "",
      lastName: "",
      countryCode: "BJ",
      phone: "",
      email: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toMatchObject({
        reviewerFirstName: expect.any(String),
        reviewerLastName: expect.any(String),
        reviewerPhone: expect.any(String),
        reviewerEmail: expect.any(String),
      });
    }
  });

  it("normalizes a valid phone number to the selected country's international format", () => {
    const result = validateReviewerIdentity({
      firstName: "  Aïcha  ",
      lastName: "Diallo",
      countryCode: "SN",
      phone: "77 123 45 67",
      email: "AICHA@example.com",
    });

    expect(result).toEqual({
      success: true,
      data: {
        firstName: "Aïcha",
        lastName: "Diallo",
        phone: "+221771234567",
        email: "aicha@example.com",
      },
    });
  });

  it("rejects a phone number whose calling code conflicts with the selected country", () => {
    const result = validateReviewerIdentity({
      firstName: "Aïcha",
      lastName: "Diallo",
      countryCode: "SN",
      phone: "+229771234567",
      email: "aicha@example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.reviewerPhone).toBeDefined();
    }
  });
});
