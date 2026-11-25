import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, toDate } from "@/lib/format";

describe("formatDate", () => {
  it("formate une date seule au format UTC", () => {
    expect(formatDate("2026-03-04")).toBe("04/03/2026");
  });

  it("formate un horodatage ISO complet sans lever d'exception", () => {
    // Régression : un horodatage complet concaténé à `T00:00:00Z` produisait
    // une `Invalid Date` et faisait échouer les exports PDF et Excel.
    expect(formatDate("2026-03-04T11:22:39.123Z")).toBe("04/03/2026");
    expect(formatDate("2026-03-04T23:59:59Z")).toBe("04/03/2026");
  });

  it("formate une `Date`", () => {
    expect(formatDate(new Date("2026-03-04T08:00:00Z"))).toBe("04/03/2026");
  });

  it("renvoie un tiret sur une valeur illisible au lieu de lever", () => {
    expect(formatDate("pas-une-date")).toBe("—");
    expect(formatDate(new Date("nope"))).toBe("—");
  });
});

describe("toDate", () => {
  it("renvoie `null` sur une valeur illisible", () => {
    expect(toDate("")).toBeNull();
    expect(toDate("2026-13-45")).toBeNull();
  });
});

describe("formatDateTime", () => {
  it("ajoute le suffixe UTC", () => {
    expect(formatDateTime(new Date("2026-03-04T08:05:00Z"))).toContain("UTC");
  });

  it("renvoie un tiret sur une date invalide", () => {
    expect(formatDateTime(new Date("nope"))).toBe("—");
  });
});
