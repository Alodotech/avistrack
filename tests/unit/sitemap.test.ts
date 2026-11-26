import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sitemap", () => {
  it("lists canonical public routes without invented modification dates", () => {
    vi.stubEnv("NODE_ENV", "production");

    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://www.avistrack.org",
      "https://www.avistrack.org/tarifs",
      "https://www.avistrack.org/conditions-generales",
      "https://www.avistrack.org/mentions-legales",
      "https://www.avistrack.org/confidentialite",
    ]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(entries.every((entry) => !entry.lastModified)).toBe(true);
  });
});
