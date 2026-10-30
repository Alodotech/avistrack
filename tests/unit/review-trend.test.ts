import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVIEW_FORM_CONFIG,
  hasSingleRatingQuestion,
  MAX_FORM_QUESTIONS,
  withFormDefaults,
} from "@/lib/review-form";
import { buildDailyTrend } from "@/lib/review-trend";
import type { Review } from "@/server/domain";

function review(createdAt: string): Review {
  return {
    id: createdAt,
    companyId: "company-1",
    rating: 5,
    comment: null,
    customerFirstName: null,
    customerLastName: null,
    customerPhone: null,
    visitDate: "2026-06-01",
    createdAt: new Date(createdAt),
  };
}

describe("buildDailyTrend", () => {
  it("renvoie une série continue du plus ancien au plus récent", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const points = buildDailyTrend(
      [
        review("2026-06-15T08:00:00Z"),
        review("2026-06-13T23:59:59Z"),
        review("2026-06-14T00:00:00Z"),
        review("2026-06-10T00:00:00Z"), // hors fenêtre
      ],
      3,
      now,
    );

    expect(points).toEqual([
      { date: "2026-06-13", count: 1 },
      { date: "2026-06-14", count: 1 },
      { date: "2026-06-15", count: 1 },
    ]);
  });

  it("compte les avis d'un même jour et laisse les jours vides à zéro", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const points = buildDailyTrend(
      [review("2026-06-15T01:00:00Z"), review("2026-06-15T22:00:00Z")],
      3,
      now,
    );

    expect(points).toEqual([
      { date: "2026-06-13", count: 0 },
      { date: "2026-06-14", count: 0 },
      { date: "2026-06-15", count: 2 },
    ]);
  });
});

describe("withFormDefaults", () => {
  it("retourne les valeurs par défaut sans configuration", () => {
    expect(withFormDefaults(null)).toEqual(DEFAULT_REVIEW_FORM_CONFIG);
    expect(withFormDefaults(undefined)).toEqual(DEFAULT_REVIEW_FORM_CONFIG);
  });

  it("ne remplace que les champs fournis", () => {
    const config = withFormDefaults({ thanksTitle: "Merci !" });
    expect(config.thanksTitle).toBe("Merci !");
    expect(config.questions).toEqual(DEFAULT_REVIEW_FORM_CONFIG.questions);
    expect(config.thanksMessage).toBe(
      DEFAULT_REVIEW_FORM_CONFIG.thanksMessage,
    );
  });

  it("retombe sur les questions par défaut si la liste est vide ou invalide", () => {
    expect(withFormDefaults({ questions: [] }).questions).toEqual(
      DEFAULT_REVIEW_FORM_CONFIG.questions,
    );
  });

  it("plafonne le nombre de questions", () => {
    const many = Array.from({ length: MAX_FORM_QUESTIONS + 3 }, (_, index) => ({
      id: `q_${index}`,
      type: "text" as const,
      label: `Question ${index}`,
      required: false,
    }));
    expect(withFormDefaults({ questions: many }).questions).toHaveLength(
      MAX_FORM_QUESTIONS,
    );
  });
});

describe("hasSingleRatingQuestion", () => {
  it("vrai pour la configuration par défaut", () => {
    expect(hasSingleRatingQuestion(DEFAULT_REVIEW_FORM_CONFIG.questions)).toBe(
      true,
    );
  });

  it("faux sans note ou avec plusieurs notes", () => {
    expect(hasSingleRatingQuestion([])).toBe(false);
    expect(
      hasSingleRatingQuestion([
        { id: "a", type: "rating", label: "Note A", required: true },
        { id: "b", type: "rating", label: "Note B", required: true },
      ]),
    ).toBe(false);
  });
});
