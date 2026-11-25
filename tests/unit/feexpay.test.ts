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
});
