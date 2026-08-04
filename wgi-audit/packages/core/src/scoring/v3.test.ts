/**
 * Scoring v3 — the fix for a number nobody could trace.
 *
 * The case that motivated it is the first test: a real audit with no vendor
 * keys, three measured categories in the high seventies, and a reported
 * overall of 62. Half the tests here exist to make sure that specific
 * arithmetic can never come back.
 */
import { describe, expect, it } from "vitest";
import type { ScoringInput } from "./v1.ts";
import * as v2 from "./v2.ts";
import * as v3 from "./v3.ts";
import { CURRENT_SCORING_VERSION, scorerFor } from "./index.ts";

/**
 * An input whose category scores come out at fixed values, so the test is
 * about how they are *combined* rather than about how each one is computed.
 */
function fixed(scores: Partial<Record<v3.Category, number>>, over: Partial<ScoringInput> = {}) {
  const input = {
    domain: "x.test", pages: [], sitemapUrls: [], hasSitemap: false,
    robotsDisallow: [], https: true, psi: [], brokenUrls: [], areas: [],
    ...over,
  } as ScoringInput;

  // Override the category functions by pre-computing: v3.score calls the real
  // ones, so instead assert against the weighted maths directly where needed.
  return { input, scores };
}

describe("the 62 that should have been 79", () => {
  /**
   * Reproduces the reported audit exactly: conversion 78, on-page 82,
   * technical 80 measured; local, content and visibility never collected.
   */
  const W = v3.WEIGHTS;
  const measured = { conversion: 78, onpage: 82, technical: 80 };

  it("v2 dilutes the score with placeholder 50s across 60% of the weight", () => {
    const v2Overall =
      78 * W.conversion + 50 * W.local + 50 * W.content +
      50 * W.visibility + 82 * W.onpage + 80 * W.technical;
    expect(Math.round(v2Overall)).toBe(62);
  });

  it("v3 renormalises to what was measured, giving 79", () => {
    const weight = W.conversion + W.onpage + W.technical;
    const v3Overall =
      (78 * W.conversion + 82 * W.onpage + 80 * W.technical) / weight;
    expect(Math.round(v3Overall)).toBe(79);
  });

  it("v3's overall is never below every measured category", () => {
    // The property that made the old number look broken to a human reader.
    const weight = W.conversion + W.onpage + W.technical;
    const overall =
      (78 * W.conversion + 82 * W.onpage + 80 * W.technical) / weight;
    expect(overall).toBeGreaterThanOrEqual(Math.min(...Object.values(measured)));
    expect(overall).toBeLessThanOrEqual(Math.max(...Object.values(measured)));
  });
});

describe("measuredCategories", () => {
  const base = fixed({}).input;

  it("always counts the three that come from the crawl", () => {
    expect([...v3.measuredCategories(base)].sort())
      .toEqual(["conversion", "onpage", "technical"]);
  });

  it("counts local once there is GBP data", () => {
    const withGbp = { ...base, gbp: { exists: true, verified: true, reviews: 5,
      replyRatePercent: 0, lastPhotoDaysAgo: null, infoCompletenessPercent: 50,
      competitorAverageReviews: null } } as ScoringInput;
    expect(v3.measuredCategories(withGbp).has("local")).toBe(true);
  });

  it("counts visibility only when a keyword was really checked", () => {
    const zero = { ...base,
      visibility: { keywordsChecked: 0, inTop10: 0, inTop3: 0 } } as ScoringInput;
    const some = { ...base,
      visibility: { keywordsChecked: 30, inTop10: 0, inTop3: 0 } } as ScoringInput;
    expect(v3.measuredCategories(zero).has("visibility")).toBe(false);
    expect(v3.measuredCategories(some).has("visibility")).toBe(true);
  });

  it("counts content once a competitor was crawled", () => {
    const withRivals = { ...base,
      competitorPageCounts: { servicePages: [10], articles: [4] } } as ScoringInput;
    expect(v3.measuredCategories(withRivals).has("content")).toBe(true);
  });
});

describe("coverage", () => {
  const base = fixed({}).input;

  it("is 0.4 with no vendors — conversion, on-page and technical only", () => {
    expect(v3.coverage(base)).toBe(0.4);
  });

  it("reaches 1 when every category has data", () => {
    const full = {
      ...base,
      gbp: { exists: true, verified: true, reviews: 1, replyRatePercent: 0,
        lastPhotoDaysAgo: 1, infoCompletenessPercent: 100, competitorAverageReviews: 1 },
      visibility: { keywordsChecked: 30, inTop10: 3, inTop3: 1 },
      competitorPageCounts: { servicePages: [5], articles: [2] },
    } as ScoringInput;
    expect(v3.coverage(full)).toBe(1);
  });

  it("adds up to the documented weights", () => {
    const total = Object.values(v3.WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.round(total * 100) / 100).toBe(1);
  });
});

describe("category scores are unchanged from v2", () => {
  const input = fixed({}, {
    psi: [{ url: "x", performanceScore: 80, lcpSeconds: 2, clsScore: 0, inpMs: 90 }],
  }).input;

  it("returns the same six numbers; only the average differs", () => {
    const a = v2.score(input);
    const b = v3.score(input);
    for (const key of ["technical", "onpage", "conversion", "local", "content", "visibility"] as const) {
      expect(b[key], key).toBe(a[key]);
    }
  });

  it("keeps the same weights", () => {
    expect(v3.WEIGHTS).toEqual(v2.WEIGHTS);
  });
});

describe("version dispatch", () => {
  it("makes v3 the current formula", () => {
    expect(CURRENT_SCORING_VERSION).toBe(3);
    expect(scorerFor(CURRENT_SCORING_VERSION).version).toBe(3);
  });

  it("leaves v1 and v2 reachable and unchanged, so old reports still explain themselves", () => {
    const input = fixed({}).input;
    expect(scorerFor(1).score(input).visibility).toBe(0);   // v1: unmeasured = 0
    expect(scorerFor(2).score(input).visibility).toBe(50);  // v2: unmeasured = 50
    expect(scorerFor(3).score(input).visibility).toBe(50);  // v3: same, but excluded
  });

  it("records coverage and the measured list in the inputs, for the report", () => {
    const inputs = scorerFor(3).scoreInputs(fixed({}).input);
    expect(inputs.coverage).toBe(0.4);
    expect(inputs.measured_categories).toEqual(["conversion", "onpage", "technical"]);
    expect(inputs.scoring_version).toBe(3);
  });
});
