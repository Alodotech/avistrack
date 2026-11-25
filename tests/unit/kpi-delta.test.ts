import { describe, expect, it } from "vitest";
import {
  averageWithin,
  consecutiveWindows,
  countWithin,
  deltaChip,
  percentDelta,
} from "@/lib/kpi-delta";

const DAY_MS = 24 * 60 * 60 * 1000;

function at(offsetDays: number, now = new Date("2026-10-22T12:00:00.000Z")): Date {
  return new Date(now.getTime() + offsetDays * DAY_MS);
}

describe("consecutiveWindows", () => {
  it("découpe deux fenêtres contiguës de même durée", () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const { current, previous } = consecutiveWindows(now, 30);

    expect(current.to.getTime()).toBe(now.getTime());
    expect(current.from.getTime()).toBe(now.getTime() - 30 * DAY_MS);
    expect(previous.to.getTime()).toBe(current.from.getTime());
    expect(previous.from.getTime()).toBe(now.getTime() - 60 * DAY_MS);
    expect(previous.to.getTime()).toBe(previous.from.getTime() + 30 * DAY_MS);
  });
});

describe("countWithin", () => {
  it("inclut la borne basse, exclut la borne haute", () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const { current, previous } = consecutiveWindows(now, 30);

    const dates = [
      previous.from, // à la borne basse : inclus
      previous.to, // = current.from : bascule dans la période courante
      current.from,
      current.to, // = now : exclue (fenêtre semi-ouverte)
    ];

    expect(countWithin(dates, previous)).toBe(1);
    expect(countWithin(dates, current)).toBe(2);
  });
});

describe("averageWithin", () => {
  it("retourne null quand la fenêtre est vide", () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const { current } = consecutiveWindows(now, 30);

    expect(averageWithin([], current)).toBeNull();
    expect(
      averageWithin([{ rating: 5, createdAt: at(-100, now) }], current),
    ).toBeNull();
  });

  it("moyenne arrondie à une décimale sur les avis de la fenêtre", () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const { current, previous } = consecutiveWindows(now, 30);

    const events = [
      { rating: 5, createdAt: at(-5, now) },
      { rating: 4, createdAt: at(-1, now) },
      { rating: 1, createdAt: at(-40, now) }, // période précédente
      { rating: 2, createdAt: at(-400, now) }, // hors fenêtres
    ];

    expect(averageWithin(events, current)).toBe(4.5);
    expect(averageWithin(events, previous)).toBe(1);
  });
});

describe("percentDelta", () => {
  it("mesure la variation relative arrondie à l'unité", () => {
    expect(percentDelta(12, 8)).toBe(50);
    expect(percentDelta(8, 12)).toBe(-33);
    expect(percentDelta(10, 10)).toBe(0);
    expect(percentDelta(0, 10)).toBe(-100);
  });

  it("refuse une base nulle : pas de pourcentage inventé", () => {
    expect(percentDelta(0, 0)).toBeNull();
    expect(percentDelta(14, 0)).toBeNull();
  });
});

describe("deltaChip", () => {
  it("transporte le libellé de comparaison", () => {
    expect(deltaChip(12, 8, "30 jours précédents")).toEqual({
      value: 50,
      label: "30 jours précédents",
    });
    expect(deltaChip(3, 0, "30 jours précédents")).toBeNull();
  });
});
