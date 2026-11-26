import { describe, expect, it } from "vitest";
import {
  FEEXPAY_COUNTRIES,
  getFeexPayCountry,
  isFeexPayCountry,
  isFeexPayOperator,
  normalizeFeexPayPhoneNumber,
} from "@/lib/feexpay";

describe("pays et opérateurs FeexPay", () => {
  it("expose les pays FeexPay et les opérateurs rattachés au bon pays", () => {
    expect(FEEXPAY_COUNTRIES.map(({ code }) => code)).toEqual([
      "BJ",
      "BF",
      "CI",
      "SN",
      "TG",
      "CG",
    ]);
    expect(isFeexPayOperator("BJ", "mtn")).toBe(true);
    expect(isFeexPayOperator("BJ", "orange_bf")).toBe(false);
    expect(isFeexPayOperator("CI", "wave_ci")).toBe(true);
  });

  it("rejette les pays non configurés", () => {
    expect(isFeexPayCountry("NG")).toBe(false);
    expect(getFeexPayCountry("NG")).toBeNull();
  });

  it("normalise les numéros locaux selon l'indicatif du pays", () => {
    expect(normalizeFeexPayPhoneNumber("01 97 00 00 00", "BJ")).toBe(
      "2290197000000",
    );
    expect(normalizeFeexPayPhoneNumber("+225 07 00 00 00 00", "CI")).toBe(
      "2250700000000",
    );
    expect(normalizeFeexPayPhoneNumber("+2250700000000", "BJ")).toBeNull();
  });

  it("respecte la longueur nationale actuelle de chaque pays pris en charge", () => {
    const validNumbers = [
      ["BJ", "+229 01 97 00 00 00", "2290197000000"],
      ["BF", "+226 70 12 34 56", "22670123456"],
      ["CI", "+225 07 00 00 00 00", "2250700000000"],
      ["SN", "+221 77 123 45 67", "221771234567"],
      ["TG", "+228 90 12 34 56", "22890123456"],
      ["CG", "+242 06 123 45 67", "242061234567"],
    ] as const;

    for (const [countryCode, phone, normalized] of validNumbers) {
      expect(normalizeFeexPayPhoneNumber(phone, countryCode)).toBe(normalized);
    }

    expect(normalizeFeexPayPhoneNumber("+229 01 97 00 00 00 00", "BJ")).toBeNull();
    expect(normalizeFeexPayPhoneNumber("+229 01 97 00 00 00", "BF")).toBeNull();
    expect(normalizeFeexPayPhoneNumber("+229 01 97 00 00 abc", "BJ")).toBeNull();
  });
});
