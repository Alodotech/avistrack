import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl, siteUrlOrFallback } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("uses the custom production domain instead of the Vercel deployment alias", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://avistrack.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "avistrack.vercel.app");

    expect(siteUrl()).toBe("https://www.avistrack.org");
    expect(siteUrlOrFallback()).toBe("https://www.avistrack.org");
  });

  it("honors the configured URL during local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001/");

    expect(siteUrl()).toBe("http://localhost:3001");
    expect(siteUrlOrFallback()).toBe("http://localhost:3001");
  });
});
