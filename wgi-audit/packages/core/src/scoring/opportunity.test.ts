/**
 * The seller's score. Deterministic, explained, and vetoed where there is no
 * business to sell to — with the presence summariser tested alongside because
 * the two are only meaningful together.
 */
import { describe, expect, it } from "vitest";
import type { Finding } from "../types/index.ts";
import { summarise, type PresenceResult } from "../pipeline/09-presence.ts";
import { quickWins, scoreOpportunity } from "./opportunity.ts";

const finding = (over: Partial<Finding>): Finding => ({
  code: "X", category: "conversion", severity: "medium", evidence: {},
  impactScore: 5, effortHours: 4, ...over,
});

const presence = (over: Partial<PresenceResult> = {}): PresenceResult => ({
  ads: { verdict: "no", platforms: [], evidence: [], googleSerp: false, googleSerpTerms: [] },
  social: {},
  activity: { reachable: true, parked: false, copyrightYear: 2025, yearsStale: 1, pagesCrawled: 5 },
  ...over,
});

describe("quickWins", () => {
  it("keeps high-impact, low-effort findings, sorted by leverage", () => {
    const wins = quickWins([
      finding({ code: "CVR-001", impactScore: 10, effortHours: 1 }),
      finding({ code: "ONP-005", impactScore: 7, effortHours: 8 }),   // too much work
      finding({ code: "TEC-004", impactScore: 4, effortHours: 1 }),   // too little impact
      finding({ code: "CVR-002", impactScore: 8, effortHours: 2 }),
    ]);
    expect(wins.map((w) => w.code)).toEqual(["CVR-001", "CVR-002"]);
    expect(wins[0]!.leverage).toBe(10);
  });

  it("is stable for equal leverage", () => {
    const a = quickWins([finding({ code: "B", impactScore: 8, effortHours: 2 }), finding({ code: "A", impactScore: 8, effortHours: 2 })]);
    expect(a.map((w) => w.code)).toEqual(["A", "B"]);
  });
});

describe("scoreOpportunity", () => {
  const badSite = [
    finding({ code: "CVR-001", severity: "critical", impactScore: 10, effortHours: 1 }),
    finding({ code: "CVR-005", severity: "critical", impactScore: 9, effortHours: 3 }),
    finding({ code: "ONP-003", category: "onpage", severity: "medium" }),
  ];

  it("gives a bad, reachable, advertising site a high score with an ads pitch", () => {
    const o = scoreOpportunity({
      overall: 30, findings: badSite,
      presence: presence({ ads: { verdict: "yes", platforms: ["meta"], evidence: ["meta: fbq"], googleSerp: true, googleSerpTerms: ["ล้างแอร์"] } }),
      contact: { tel: true, line: true },
    });
    expect(o.score).toBeGreaterThan(70);
    expect(o.pitch).toBe("ads_leak");
    expect(o.components.budget.evidence.join(" ")).toContain("Google Ads");
    expect(o.vetoes).toEqual([]);
  });

  it("gives a good site with no ads a low score", () => {
    const o = scoreOpportunity({
      overall: 90, findings: [], presence: presence(), contact: { tel: true, line: false },
    });
    expect(o.score).toBeLessThan(40);
    expect(o.pitch).toBe("fix_list");
  });

  it("vetoes a parked domain no matter how bad the findings look", () => {
    const o = scoreOpportunity({
      overall: 5, findings: badSite,
      presence: presence({ activity: { reachable: true, parked: true, copyrightYear: null, yearsStale: null, pagesCrawled: 1 } }),
      contact: { tel: true, line: true },
    });
    expect(o.score).toBeLessThanOrEqual(10);
    expect(o.pitch).toBe("not_a_lead");
    expect(o.vetoes[0]).toContain("placeholder");
  });

  it("scores zero when the site is unreachable", () => {
    const o = scoreOpportunity({
      overall: null, findings: [],
      presence: presence({ activity: { reachable: false, parked: false, copyrightYear: null, yearsStale: null, pagesCrawled: 0 } }),
      contact: { tel: false, line: false },
    });
    expect(o.score).toBe(0);
  });

  it("picks the 'cannot be contacted' angle when there is no way to reach them", () => {
    const o = scoreOpportunity({
      overall: 50, findings: [finding({ code: "ONP-001", category: "onpage" })],
      presence: presence(), contact: { tel: false, line: false },
    });
    expect(o.pitch).toBe("cannot_be_contacted");
    expect(o.components.reach.value).toBe(0);
  });

  it("carries evidence on every non-zero component", () => {
    const o = scoreOpportunity({
      overall: 40, findings: badSite,
      presence: presence({ social: { facebook: "https://facebook.com/x" } }),
      contact: { tel: true, line: false },
    });
    for (const c of Object.values(o.components)) {
      if (c.value > 0) expect(c.evidence.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    const input = { overall: 42, findings: badSite, presence: presence(), contact: { tel: true, line: true } };
    expect(scoreOpportunity(input)).toEqual(scoreOpportunity(input));
  });

  it("stays within 0..100 and never rewards an unknown presence", () => {
    const o = scoreOpportunity({ overall: 0, findings: badSite, presence: null, contact: { tel: true, line: true } });
    expect(o.score).toBeGreaterThanOrEqual(0);
    expect(o.score).toBeLessThanOrEqual(100);
    expect(o.components.budget.value).toBe(0);
    expect(o.components.alive.value).toBe(0);
  });
});

describe("presence summarise", () => {
  const page = (over: Partial<Parameters<typeof summarise>[0]["pages"][number]> = {}) => ({
    adTags: [], socialLinks: {}, looksParked: false, copyrightYear: null,
    pageType: "service", isCompetitor: false, ...over,
  });

  it("unions ad tags across pages and reports each platform once", () => {
    const r = summarise({
      pages: [
        page({ adTags: [{ platform: "meta", evidence: "fbq" }] }),
        page({ adTags: [{ platform: "meta", evidence: "fbq" }, { platform: "gtm", evidence: "gtm.js" }] }),
      ],
      reachable: true, serp: [],
    });
    expect(r.ads.platforms.sort()).toEqual(["gtm", "meta"]);
    expect(r.ads.verdict).toBe("yes");
  });

  it("treats a paid SERP appearance as a definite yes even with no tags", () => {
    const r = summarise({ pages: [page()], reachable: true, serp: [{ term: "ล้างแอร์", ownPaid: true }, { term: "x", ownPaid: false }] });
    expect(r.ads.verdict).toBe("yes");
    expect(r.ads.googleSerpTerms).toEqual(["ล้างแอร์"]);
  });

  it("never reads a competitor's pages", () => {
    const r = summarise({
      pages: [page({ isCompetitor: true, adTags: [{ platform: "meta", evidence: "x" }], socialLinks: { facebook: "https://facebook.com/rival" } })],
      reachable: true, serp: [],
    });
    expect(r.ads.verdict).toBe("no");
    expect(r.social).toEqual({});
  });

  it("calls the site parked only when the homepage is", () => {
    const home = page({ pageType: "home", looksParked: false });
    const inner = page({ pageType: "other", looksParked: true });
    expect(summarise({ pages: [home, inner], reachable: true, serp: [] }).activity.parked).toBe(false);
    expect(summarise({ pages: [page({ pageType: "home", looksParked: true })], reachable: true, serp: [] }).activity.parked).toBe(true);
  });

  it("takes the newest copyright year and measures staleness from now", () => {
    const r = summarise({
      pages: [page({ copyrightYear: 2019 }), page({ copyrightYear: 2023 })],
      reachable: true, serp: [], now: new Date("2026-08-04"),
    });
    expect(r.activity.copyrightYear).toBe(2023);
    expect(r.activity.yearsStale).toBe(3);
  });
});
