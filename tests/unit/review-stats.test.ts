import { describe, expect, it } from "vitest";
import { nextStatus } from "@/lib/company-status";
import { pageCount, parsePage } from "@/lib/pagination";
import { emptyDistribution, statsFromDistribution } from "@/lib/review-stats";

describe("statsFromDistribution", () => {
  it("n'affiche aucune moyenne sans avis", () => {
    expect(statsFromDistribution(emptyDistribution())).toMatchObject({
      total: 0,
      average: null,
    });
  });

  it("arrondit la moyenne à une décimale (RG-06)", () => {
    // (5 + 5 + 4) / 3 = 4,666…
    const stats = statsFromDistribution({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 });
    expect(stats.total).toBe(3);
    expect(stats.average).toBe(4.7);
  });
});

describe("nextStatus", () => {
  it("suspend une entreprise active et réactive une entreprise suspendue", () => {
    expect(nextStatus("ACTIVE", "SUSPEND")).toBe("SUSPENDED");
    expect(nextStatus("SUSPENDED", "REACTIVATE")).toBe("ACTIVE");
  });

  it("refuse d'activer un compte en attente de vérification e-mail", () => {
    expect(nextStatus("PENDING", "REACTIVATE")).toBeNull();
    expect(nextStatus("PENDING", "SUSPEND")).toBeNull();
  });

  it("refuse les transitions sans effet", () => {
    expect(nextStatus("ACTIVE", "REACTIVATE")).toBeNull();
    expect(nextStatus("SUSPENDED", "SUSPEND")).toBeNull();
  });
});

describe("pagination", () => {
  it("retombe sur la page 1 pour toute valeur invalide", () => {
    for (const value of [undefined, "", "0", "-3", "abc", "1.5", "1e9"]) {
      expect(parsePage(value)).toBe(1);
    }
    expect(parsePage("4")).toBe(4);
    expect(parsePage(["2", "9"])).toBe(2);
  });

  it("compte au moins une page", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(47, 10)).toBe(5);
  });
});
