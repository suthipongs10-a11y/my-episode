/**
 * Scoring v2, and the versioning that lets it exist.
 *
 * The point of this file is the difference from v1 and nothing else: v1 must
 * keep producing exactly what it produced when customers were shown it, and v2
 * must stop scoring an unmeasured category as a failure.
 */
import { describe, expect, it } from "vitest";
import type { ScoringInput } from "./v1.ts";
import * as v1 from "./v1.ts";
import * as v2 from "./v2.ts";
import { CURRENT_SCORING_VERSION, scorerFor } from "./index.ts";
import { withM3Inputs } from "../pipeline/12-scoring.ts";
import type { KeywordFact, SiteFacts } from "../rules/context.ts";

function input(over: Partial<ScoringInput> = {}): ScoringInput {
  return {
    domain: "mine.test", pages: [], sitemapUrls: [], hasSitemap: false,
    robotsDisallow: [], https: true, psi: [], brokenUrls: [], areas: [],
    ...over,
  } as ScoringInput;
}

const keyword = (over: Partial<KeywordFact> = {}): KeywordFact => ({
  term: "k", intent: "transactional", area: null, volume: null,
  checked: true, position: null, ahead: [], paidDomains: [], ...over,
});

describe("the one thing v2 changed", () => {
  it("v1 scores an unchecked site 0 for visibility", () => {
    expect(v1.visibilityScore(input())).toBe(0);
  });

  it("v2 scores it 50 — unknown, not failed", () => {
    expect(v2.visibilityScore(input())).toBe(50);
  });

  it("both agree once the keywords really were checked", () => {
    const checked = input({ visibility: { keywordsChecked: 10, inTop10: 5, inTop3: 2 } });
    expect(v2.visibilityScore(checked)).toBe(v1.visibilityScore(checked));
  });

  it("v2 still scores 0 when we looked and nothing ranks", () => {
    expect(v2.visibilityScore(input({
      visibility: { keywordsChecked: 30, inTop10: 0, inTop3: 0 },
    }))).toBe(0);
  });

  it("so an audit with no DataForSEO key is not punished 15 points", () => {
    const facts = input();
    expect(v2.score(facts).overall).toBeGreaterThan(v1.score(facts).overall);
  });
});

describe("everything else is untouched", () => {
  const rich = input({
    psi: [{ url: "x", performanceScore: 80, lcpSeconds: 2, clsScore: 0, inpMs: 100 }],
    visibility: { keywordsChecked: 10, inTop10: 4, inTop3: 1 },
  });

  it("gives the same technical, on-page, conversion, local and content scores", () => {
    const a = v1.score(rich);
    const b = v2.score(rich);
    expect({ ...b, overall: 0 }).toEqual({ ...a, overall: 0 });
  });

  it("keeps the same weights", () => {
    expect(v2.WEIGHTS).toEqual(v1.WEIGHTS);
  });
});

describe("version dispatch", () => {
  it("hands back the formula a run was scored under", () => {
    expect(scorerFor(1).version).toBe(1);
    expect(scorerFor(2).version).toBe(2);
  });

  it("falls back to the current formula for a version it does not know", () => {
    expect(scorerFor(99).version).toBe(CURRENT_SCORING_VERSION);
  });

  it("an old run keeps its old numbers", () => {
    const facts = input();
    expect(scorerFor(1).score(facts).visibility).toBe(0);
    expect(scorerFor(2).score(facts).visibility).toBe(50);
  });
});

describe("withM3Inputs", () => {
  const facts = (over: Partial<SiteFacts> = {}): SiteFacts => ({
    domain: "mine.test", pages: [], sitemapUrls: [], hasSitemap: false,
    robotsDisallow: [], https: true, psi: [], brokenUrls: [], areas: [], ...over,
  });

  it("leaves visibility undefined when no SERP was ever fetched", () => {
    const out = withM3Inputs(facts({ keywords: [keyword({ checked: false })] }));
    expect(out.visibility).toBeUndefined();
    expect(v2.score(out).visibility).toBe(50);
  });

  /**
   * The distinction this whole `checked` flag exists for. Both cases have
   * `position: null` on every keyword; only one of them is a real result.
   */
  it("scores 0 — not 50 — when we searched and the site ranks nowhere", () => {
    const out = withM3Inputs(facts({
      keywords: [keyword({ checked: true }), keyword({ checked: true })],
    }));
    expect(out.visibility).toEqual({ keywordsChecked: 2, inTop10: 0, inTop3: 0 });
    expect(v2.score(out).visibility).toBe(0);
  });

  it("counts top-10 and top-3 separately", () => {
    const out = withM3Inputs(facts({
      keywords: [
        keyword({ position: 1 }), keyword({ position: 7 }),
        keyword({ position: 40 }), keyword({ position: null }),
      ],
    }));
    expect(out.visibility).toEqual({ keywordsChecked: 4, inTop10: 2, inTop3: 1 });
  });

  it("ignores unchecked keywords in the count", () => {
    const out = withM3Inputs(facts({
      keywords: [keyword({ position: 1 }), keyword({ checked: false })],
    }));
    expect(out.visibility?.keywordsChecked).toBe(1);
  });

  it("ignores a competitor that could not be crawled", () => {
    const out = withM3Inputs(facts({
      competitors: [
        { domain: "a", pagesCrawled: 0, counts: {}, serviceTitles: [], hasFaq: false, notMeasured: true },
      ],
    }));
    expect(out.competitorPageCounts).toBeUndefined();
  });

  it("adds location pages to the service count, since both sell something", () => {
    const out = withM3Inputs(facts({
      competitors: [{
        domain: "a", pagesCrawled: 20,
        counts: { service: 6, location: 4, article: 3 },
        serviceTitles: [], hasFaq: false, notMeasured: false,
      }],
    }));
    expect(out.competitorPageCounts).toEqual({ servicePages: [10], articles: [3] });
  });
});
