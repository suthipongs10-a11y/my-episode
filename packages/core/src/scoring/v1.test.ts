/**
 * Scoring v1, with the numbers locked.
 *
 * The exact values below are the contract: if a change moves them, either the
 * change is wrong or it belongs in a v2. A report already sent to a customer
 * has to keep meaning what it said.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPage, type ExtractedPage } from "../crawl/extract.ts";
import { classifyExtracted } from "../crawl/classify.ts";
import type { SiteFacts } from "../rules/index.ts";
import {
  SCORING_VERSION, WEIGHTS, contentScore, conversionScore, localScore,
  onpageScore, score, technicalScore, visibilityScore, type ScoringInput,
} from "./v1.ts";

const FIXTURES = fileURLToPath(new URL("../../../../fixtures/", import.meta.url));
const fixture = (p: string) => readFileSync(join(FIXTURES, p), "utf8");

function page(url: string, file: string, domain: string): ExtractedPage {
  const p = extractPage(url, fixture(file), { domain });
  p.pageType = classifyExtracted(p, {
    isHomepage: new URL(url).pathname === "/",
    areas: ["ภูเก็ต"],
  }).type;
  return p;
}

const D = "phuketmaidservice.com";

function badSite(over: Partial<ScoringInput> = {}): ScoringInput {
  const base: SiteFacts = {
    domain: D,
    pages: [
      page(`https://${D}/`, "phuketmaid/index.html", D),
      page(`https://${D}/services/deep-cleaning/`, "phuketmaid/services-deep-cleaning.html", D),
      page(`https://${D}/contact/`, "phuketmaid/contact.html", D),
    ],
    sitemapUrls: [], hasSitemap: false, robotsDisallow: [],
    https: true, psi: [], brokenUrls: [], areas: ["ภูเก็ต"],
  };
  return { ...base, ...over };
}

describe("weights", () => {
  it("sums to 1", () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("puts conversion and local first — fastest to fix, and what we sell", () => {
    expect(WEIGHTS.conversion).toBe(0.25);
    expect(WEIGHTS.local).toBe(0.25);
    expect(WEIGHTS.conversion).toBeGreaterThan(WEIGHTS.technical);
  });

  it("declares its version", () => {
    expect(SCORING_VERSION).toBe(1);
  });
});

describe("locked scores for the fixture site", () => {
  const s = score(badSite());

  it("matches the recorded values", () => {
    expect(s).toEqual({
      overall: 29,
      technical: 60,
      onpage: 33,
      conversion: 0,     // the fixture fails all nine applicable CVR checks
      local: 50,         // no GBP data yet: unknown, not failed
      content: 50,       // no competitors yet: unknown, not failed
      visibility: 0,     // not ranking is a measured result
    });
  });

  it("is reproducible", () => {
    expect(score(badSite())).toEqual(s);
  });
});

describe("technicalScore", () => {
  it("treats an unmeasured site as neutral rather than failing it", () => {
    const withoutPsi = technicalScore(badSite({ psi: [] }));
    const withGoodPsi = technicalScore(badSite({
      psi: [{ url: "x", performanceScore: 95, lcpSeconds: 1, clsScore: 0, inpMs: 50 }],
    }));
    expect(withoutPsi).toBeLessThan(withGoodPsi);
    expect(withoutPsi).toBeGreaterThan(0);
  });

  it("penalises no HTTPS", () => {
    expect(technicalScore(badSite({ https: false })))
      .toBeLessThan(technicalScore(badSite({ https: true })));
  });
});

describe("onpageScore", () => {
  it("is zero when nothing was crawled", () => {
    expect(onpageScore(badSite({ pages: [] }))).toBe(0);
  });

  it("does not hold a short about page against the site", () => {
    // Only service and location pages carry a length expectation.
    const facts = badSite();
    const withoutServices = badSite({
      pages: facts.pages.filter((p) => p.pageType !== "service" && p.pageType !== "location"),
    });
    expect(onpageScore(withoutServices)).toBeGreaterThan(onpageScore(facts));
  });
});

describe("conversionScore", () => {
  it("is low for a site you cannot contact easily", () => {
    expect(conversionScore(badSite())).toBeLessThan(30);
  });

  it("excludes the check that needs data we do not have yet", async () => {
    // CVR-010 needs GBP (M4). Counting it as failed would understate every
    // score for a reason the owner cannot act on.
    const { conversionChecks } = await import("../rules/conversion.ts");
    expect(conversionChecks(badSite()).total).toBe(9);
  });

  it("rises as contact channels are added", () => {
    const facts = badSite();
    const improved = badSite({
      pages: facts.pages.map((p) => ({ ...p, hasTelLink: true, hasLineLink: true })),
    });
    expect(conversionScore(improved)).toBeGreaterThan(conversionScore(facts));
  });
});

describe("localScore", () => {
  it("says 'unknown' rather than 'failed' before GBP data exists", () => {
    expect(localScore(badSite())).toBe(50);
  });

  it("is zero when we looked and there is no listing", () => {
    expect(localScore(badSite({
      gbp: {
        exists: false, verified: false, reviews: 0, replyRatePercent: 0,
        lastPhotoDaysAgo: null, infoCompletenessPercent: 0,
        competitorAverageReviews: 100,
      },
    }))).toBe(0);
  });

  it("rewards a verified listing with reviews and replies", () => {
    const strong = localScore(badSite({
      gbp: {
        exists: true, verified: true, reviews: 180, replyRatePercent: 90,
        lastPhotoDaysAgo: 5, infoCompletenessPercent: 100,
        competitorAverageReviews: 150,
      },
    }));
    expect(strong).toBeGreaterThan(90);
  });

  it("scores an unverified listing below a verified one", () => {
    const gbp = {
      exists: true, reviews: 10, replyRatePercent: 0, lastPhotoDaysAgo: 200,
      infoCompletenessPercent: 50, competitorAverageReviews: 100,
    };
    expect(localScore(badSite({ gbp: { ...gbp, verified: false } })))
      .toBeLessThan(localScore(badSite({ gbp: { ...gbp, verified: true } })));
  });
});

describe("contentScore", () => {
  it("says 'unknown' before there are competitors to compare with", () => {
    expect(contentScore(badSite())).toBe(50);
  });

  it("compares service page counts once competitors are known", () => {
    const behind = contentScore(badSite({
      competitorPageCounts: { servicePages: [20, 28, 24], articles: [] },
    }));
    expect(behind).toBeLessThan(20);
  });

  it("caps at 100 when we have more pages than they do", () => {
    expect(contentScore(badSite({
      competitorPageCounts: { servicePages: [1], articles: [] },
    }))).toBe(100);
  });
});

describe("visibilityScore", () => {
  it("is zero when not ranking — that is a real result, not missing data", () => {
    expect(visibilityScore(badSite({
      visibility: { keywordsChecked: 30, inTop10: 0, inTop3: 0 },
    }))).toBe(0);
  });

  it("is 100 when everything is in the top 3", () => {
    expect(visibilityScore(badSite({
      visibility: { keywordsChecked: 30, inTop10: 30, inTop3: 30 },
    }))).toBe(100);
  });

  it("weights the top 3 above the rest of the top 10", () => {
    const topTen = visibilityScore(badSite({
      visibility: { keywordsChecked: 10, inTop10: 5, inTop3: 0 },
    }));
    const topThree = visibilityScore(badSite({
      visibility: { keywordsChecked: 10, inTop10: 5, inTop3: 5 },
    }));
    expect(topThree).toBeGreaterThan(topTen);
  });
});

describe("bounds", () => {
  it("never leaves 0-100, whatever it is handed", () => {
    const extreme = score(badSite({
      psi: [{ url: "x", performanceScore: 100, lcpSeconds: 0, clsScore: 0, inpMs: 0 }],
      visibility: { keywordsChecked: 1, inTop10: 1, inTop3: 1 },
      competitorPageCounts: { servicePages: [0], articles: [] },
      gbp: {
        exists: true, verified: true, reviews: 99999, replyRatePercent: 100,
        lastPhotoDaysAgo: 0, infoCompletenessPercent: 100,
        competitorAverageReviews: 1,
      },
    }));
    for (const [key, value] of Object.entries(extreme)) {
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThanOrEqual(100);
    }
  });

  it("handles a site where nothing could be crawled", () => {
    const s = score(badSite({ pages: [], https: false }));
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.onpage).toBe(0);
  });
});
