/**
 * The seller's score. Deterministic, explained row by row, and vetoed where
 * there is no business to sell to — with the presence summariser tested
 * alongside because the two are only meaningful together.
 */
import { describe, expect, it } from "vitest";
import type { Finding } from "../types/index.ts";
import { summarise, type PresenceResult } from "../pipeline/09-presence.ts";
import {
  MANY_REVIEWS, SIGNAL_ORDER, quickWins, scoreOpportunity,
  type Opportunity, type OpportunityInput, type SignalKey,
} from "./opportunity.ts";

const finding = (over: Partial<Finding>): Finding => ({
  code: "X", category: "conversion", severity: "medium", evidence: {},
  impactScore: 5, effortHours: 4, ...over,
});

const presence = (over: Partial<PresenceResult> = {}): PresenceResult => ({
  ads: { verdict: "no", platforms: [], evidence: [], googleSerp: false, googleSerpTerms: [] },
  social: {},
  activity: { reachable: true, parked: false, copyrightYear: 2025, yearsStale: 1, pagesCrawled: 5 },
  business: { reviewCount: null, addresses: 0, locationPages: 0, branchMentions: 0 },
  ...over,
});

const input = (over: Partial<OpportunityInput> = {}): OpportunityInput => ({
  scores: { overall: 60, conversion: 60, onpage: 80, technical: 60, local: 50, content: 50, visibility: 50 },
  measured: { visibility: false, psi: false },
  findings: [],
  presence: presence(),
  pages: { total: 6, byType: { home: 1, service: 3, contact: 1, about: 1 } },
  contact: { tel: true, line: true },
  ...over,
});

const sig = (o: Opportunity, key: SignalKey) => o.signals.find((s) => s.key === key)!;

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

describe("scoreOpportunity — the table", () => {
  it("lays out the nine rows in the operator's order, adding up to 100", () => {
    const o = scoreOpportunity(input());
    expect(o.version).toBe(2);
    expect(o.signals.map((s) => s.key)).toEqual(SIGNAL_ORDER);
    expect(o.signals.reduce((sum, s) => sum + s.max, 0)).toBe(100);
    expect(sig(o, "ads").max).toBe(25);
    expect(sig(o, "landing").max).toBe(15);
  });

  it("scores a bad, single-page, advertising site near the top with an ads pitch", () => {
    const o = scoreOpportunity(input({
      scores: { overall: 30, conversion: 10, onpage: 40, technical: 50, local: 50, content: 50, visibility: 50 },
      findings: [
        finding({ code: "CVR-001", severity: "critical", impactScore: 10, effortHours: 1 }),
        finding({ code: "CVR-005", severity: "critical", impactScore: 9, effortHours: 3 }),
        finding({ code: "ONP-003", category: "onpage", severity: "medium" }),
      ],
      presence: presence({ ads: { verdict: "yes", platforms: ["meta"], evidence: ["meta: fbq"], googleSerp: true, googleSerpTerms: ["ล้างแอร์"] } }),
      pages: { total: 1, byType: { home: 1 } },
    }));
    expect(sig(o, "ads").points).toBe(25);
    expect(sig(o, "ads").evidence.join(" ")).toContain("Google");
    expect(sig(o, "conversion").points).toBe(20);
    expect(sig(o, "mobile").points).toBe(10);       // CVR-001 is a mobile finding
    expect(sig(o, "seo").points).toBe(10);          // on-page 40
    expect(sig(o, "landing").points).toBe(15);      // one page
    expect(o.points).toBe(80);
    expect(o.measuredMax).toBe(90);                 // GBP and reviews unmeasured
    expect(o.score).toBe(89);
    expect(o.pitch).toBe("ads_leak");
    expect(o.vetoes).toEqual([]);
  });

  it("calls a good site with nothing wrong not a lead, and one with small findings a fix list", () => {
    const clean = scoreOpportunity(input({ scores: { overall: 90, onpage: 85 } }));
    expect(clean.score).toBe(0);
    expect(clean.pitch).toBe("not_a_lead");

    const minor = scoreOpportunity(input({
      scores: { overall: 85, onpage: 80 },
      findings: [finding({ code: "ONP-003", category: "onpage", severity: "low" })],
    }));
    expect(sig(minor, "seo").status).toBe("partial");
    expect(minor.pitch).toBe("fix_list");
  });

  it("leaves unmeasured rows out of the denominator and says what would measure them", () => {
    const o = scoreOpportunity(input());
    expect(sig(o, "gbp").status).toBe("unmeasured");
    expect(sig(o, "reviews").status).toBe("unmeasured");
    expect(sig(o, "gbp").evidence.join(" ")).toContain("Google Places");
    expect(o.measuredMax).toBe(90);
    expect(o.coverage).toBeCloseTo(0.9);
  });

  it("takes a review count the site states itself as measured", () => {
    const many = scoreOpportunity(input({ presence: presence({ business: { reviewCount: MANY_REVIEWS + 5, addresses: 0, locationPages: 0, branchMentions: 0 } }) }));
    expect(sig(many, "reviews").status).toBe("hit");
    expect(sig(many, "reviews").points).toBe(5);
    expect(many.measuredMax).toBe(95);

    const few = scoreOpportunity(input({ presence: presence({ business: { reviewCount: 3, addresses: 0, locationPages: 0, branchMentions: 0 } }) }));
    expect(sig(few, "reviews").status).toBe("miss");
    expect(sig(few, "reviews").evidence.join(" ")).toContain("3");
  });

  it("sees branches in location pages, addresses, or a claim in the text", () => {
    const by = (business: PresenceResult["business"]) =>
      sig(scoreOpportunity(input({ presence: presence({ business }) })), "branches");
    expect(by({ reviewCount: null, addresses: 0, locationPages: 2, branchMentions: 0 }).status).toBe("hit");
    expect(by({ reviewCount: null, addresses: 2, locationPages: 0, branchMentions: 0 }).status).toBe("hit");
    const claim = by({ reviewCount: null, addresses: 0, locationPages: 0, branchMentions: 5 });
    expect(claim.status).toBe("hit");
    expect(claim.evidence.join(" ")).toContain("5 สาขา");
    expect(by({ reviewCount: null, addresses: 1, locationPages: 1, branchMentions: 1 }).status).toBe("miss");
  });

  it("landing page: a single page or no service page hits, one service page is partial", () => {
    const by = (pages: OpportunityInput["pages"]) => sig(scoreOpportunity(input({ pages })), "landing");
    expect(by({ total: 1, byType: { home: 1 } }).points).toBe(15);
    expect(by({ total: 4, byType: { home: 1, about: 1, contact: 1, other: 1 } }).points).toBe(15);
    expect(by({ total: 3, byType: { home: 1, service: 1, contact: 1 } }).status).toBe("partial");
    expect(by({ total: 3, byType: { home: 1, service: 2 } }).status).toBe("miss");
    expect(by({ total: 0, byType: {} }).status).toBe("unmeasured");
  });

  it("mobile: graded by the worst mobile finding, and says when speed was never measured", () => {
    const high = scoreOpportunity(input({ findings: [finding({ code: "TEC-007", category: "technical", severity: "high" })] }));
    expect(sig(high, "mobile").points).toBe(10);
    expect(sig(high, "mobile").evidence.join(" ")).toContain("PSI");

    const medium = scoreOpportunity(input({ findings: [finding({ code: "CVR-003", severity: "medium" })], measured: { visibility: false, psi: true } }));
    expect(sig(medium, "mobile").points).toBe(5);
    expect(sig(medium, "mobile").evidence.join(" ")).not.toContain("PSI");

    // An on-page finding is not a mobile finding.
    const none = scoreOpportunity(input({ findings: [finding({ code: "ONP-001", category: "onpage", severity: "high" })] }));
    expect(sig(none, "mobile").status).toBe("miss");
  });

  it("seo: weak on-page, a bad measured ranking, or two serious SEO findings", () => {
    expect(sig(scoreOpportunity(input({ scores: { overall: 50, onpage: 30 } })), "seo").points).toBe(10);
    expect(sig(scoreOpportunity(input({
      scores: { overall: 50, onpage: 80 },
      findings: [finding({ code: "ONP-001", category: "onpage", severity: "high" }), finding({ code: "TEC-005", category: "technical", severity: "high" })],
    })), "seo").points).toBe(10);
    expect(sig(scoreOpportunity(input({ scores: { overall: 50, onpage: 65 } })), "seo").status).toBe("partial");
    expect(sig(scoreOpportunity(input({ scores: { overall: 50, onpage: 80 } })), "seo").status).toBe("miss");

    const ranked = scoreOpportunity(input({ scores: { overall: 50, onpage: 80, visibility: 20 }, measured: { visibility: true, psi: false } }));
    expect(sig(ranked, "seo").points).toBe(10);
    expect(sig(ranked, "seo").evidence.join(" ")).toContain("20/100");

    // A placeholder 50 for visibility is not a measurement and never counts.
    const unchecked = scoreOpportunity(input({ scores: { overall: 50, onpage: 80, visibility: 20 }, measured: { visibility: false, psi: false } }));
    expect(sig(unchecked, "seo").evidence.join(" ")).toContain("DataForSEO");
    expect(sig(unchecked, "seo").status).toBe("miss");
  });

  it("ads: GTM alone is partial; a paid SERP appearance is a full hit without any pixel", () => {
    const gtm = scoreOpportunity(input({ presence: presence({ ads: { verdict: "maybe", platforms: ["gtm"], evidence: ["gtm: gtm.js"], googleSerp: false, googleSerpTerms: [] } }) }));
    expect(sig(gtm, "ads").status).toBe("partial");
    expect(sig(gtm, "ads").points).toBe(10);

    const serp = scoreOpportunity(input({ presence: presence({ ads: { verdict: "yes", platforms: [], evidence: [], googleSerp: true, googleSerpTerms: ["x", "y"] } }) }));
    expect(sig(serp, "ads").points).toBe(25);
    expect(sig(serp, "ads").evidence.join(" ")).toContain("2 คำ");
  });

  it("facebook: a linked page is the evidence, and the link is there to open", () => {
    const o = scoreOpportunity(input({ presence: presence({ social: { facebook: "https://facebook.com/x" } }) }));
    expect(sig(o, "facebook").points).toBe(5);
    expect(sig(o, "facebook").link).toBe("https://facebook.com/x");
    expect(sig(scoreOpportunity(input()), "facebook").status).toBe("miss");
  });

  it("vetoes a parked domain no matter how the rows read", () => {
    const o = scoreOpportunity(input({
      findings: [finding({ code: "CVR-001", severity: "critical" })],
      presence: presence({ ads: { verdict: "yes", platforms: ["meta"], evidence: ["meta"], googleSerp: false, googleSerpTerms: [] }, activity: { reachable: true, parked: true, copyrightYear: null, yearsStale: null, pagesCrawled: 1 } }),
      pages: { total: 1, byType: { home: 1 } },
    }));
    expect(o.score).toBeLessThanOrEqual(10);
    expect(o.pitch).toBe("not_a_lead");
    expect(o.vetoes[0]).toContain("placeholder");
  });

  it("scores zero when the site is unreachable", () => {
    const o = scoreOpportunity(input({
      presence: presence({ activity: { reachable: false, parked: false, copyrightYear: null, yearsStale: null, pagesCrawled: 0 } }),
      pages: { total: 0, byType: {} },
    }));
    expect(o.score).toBe(0);
    expect(o.pitch).toBe("not_a_lead");
  });

  it("picks the 'cannot be contacted' angle when there is no way to reach them", () => {
    const o = scoreOpportunity(input({
      findings: [finding({ code: "ONP-001", category: "onpage" })],
      contact: { tel: false, line: false },
    }));
    expect(o.pitch).toBe("cannot_be_contacted");
  });

  it("picks 'invisible' when SEO is weak and nobody is buying traffic", () => {
    const o = scoreOpportunity(input({ scores: { overall: 40, onpage: 30 } }));
    expect(o.pitch).toBe("invisible");
  });

  it("carries evidence on every row, scored or not", () => {
    const o = scoreOpportunity(input({ presence: null }));
    for (const s of o.signals) expect(s.evidence.length, s.key).toBeGreaterThan(0);
  });

  it("never rewards an unknown presence: its rows are unmeasured, not misses", () => {
    const o = scoreOpportunity(input({ presence: null }));
    expect(sig(o, "ads").status).toBe("unmeasured");
    expect(sig(o, "facebook").status).toBe("unmeasured");
    expect(sig(o, "branches").status).toBe("unmeasured");
    expect(o.measuredMax).toBe(100 - 25 - 5 - 5 - 5 - 5);
  });

  it("is deterministic and stays within 0..100", () => {
    const x = input({ findings: [finding({ code: "CVR-001", severity: "critical" })] });
    expect(scoreOpportunity(x)).toEqual(scoreOpportunity(x));
    const o = scoreOpportunity(x);
    expect(o.score).toBeGreaterThanOrEqual(0);
    expect(o.score).toBeLessThanOrEqual(100);
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
      pages: [page({ isCompetitor: true, adTags: [{ platform: "meta", evidence: "x" }], socialLinks: { facebook: "https://facebook.com/rival" }, reviewCount: 99 })],
      reachable: true, serp: [],
    });
    expect(r.ads.verdict).toBe("no");
    expect(r.social).toEqual({});
    expect(r.business.reviewCount).toBeNull();
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

  it("reads the business's own size claims as a max across pages, never a sum", () => {
    const r = summarise({
      pages: [
        page({ pageType: "home", reviewCount: 12, addressCount: 1, branchMentions: 0 }),
        page({ pageType: "location", reviewCount: 40, addressCount: 2 }),
        page({ pageType: "location", branchMentions: 3 }),
      ],
      reachable: true, serp: [],
    });
    expect(r.business).toEqual({ reviewCount: 40, addresses: 2, locationPages: 2, branchMentions: 3 });
  });

  it("reports nothing about size when no page says anything", () => {
    const r = summarise({ pages: [page()], reachable: true, serp: [] });
    expect(r.business).toEqual({ reviewCount: null, addresses: 0, locationPages: 0, branchMentions: 0 });
  });
});
