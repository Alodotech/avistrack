import { describe, expect, it } from "vitest";
import { hasFilledHoneypot } from "@/lib/honeypot";

describe("hasFilledHoneypot", () => {
  it("accepts an empty honeypot field", () => {
    const formData = new FormData();
    formData.set("website", "  ");

    expect(hasFilledHoneypot(formData)).toBe(false);
  });

  it("detects a filled honeypot field", () => {
    const formData = new FormData();
    formData.set("website", "https://spam.example");

    expect(hasFilledHoneypot(formData)).toBe(true);
  });

  it("does not reject submissions without the field", () => {
    expect(hasFilledHoneypot(new FormData())).toBe(false);
  });
});
