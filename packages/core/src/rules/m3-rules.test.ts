/**
 * CON and CMP rules.
 *
 * Every rule gets two tests: one where it should fire, one where it should not.
 * The second is the one that matters — a rule that fires on everything is worse
 * than no rule, because it goes in a report a stranger reads and decides
 * whether to trust us.
 *
 * The third case, unique to M3, is **absent data**. DataForSEO and the
 * competitor crawl are both optional, and a rule that treats "not collected" as
 * "measured, and bad" would tell a client they are losing to competitors we
 * never looked at.
 */
import { describe, expect, it } from "vitest";
import type { ExtractedPage } from "../crawl/extract.ts";
import type { CompetitorFact, KeywordFact, SiteFacts } from "./context.ts";
import { median } from "./context.ts";
import { con001, con002, con003, con004, con005 } from "./content.ts";
import { cmp001, cmp002, cmp003 } from "./competitor.ts";

function page(over: Partial<ExtractedPage> = {}): ExtractedPage {
  return {
    url: "https://mine.test/a", domain: "mine.test", isCompetitor: false, statusCode: 200,
    pageType: "service", title: "บริการ", titleLen: 6, metaDesc: "x", metaDescLen: 1,
    h1: ["บริการ"], h1Count: 1, wordCount: 400, internalLinks: 5, externalLinks: 0,
    imagesTotal: 1, imagesNoAlt: 0, schemaTypes: [], hasTelLink: true, hasLineLink: true,
    hasForm: false, formFieldCount: 0, hasPrice: true, hasReview: true, lang: "th",
    internalUrls: [], allUrls: [], imageHosts: [], hasViewport: true, isNoindex: false,
    ...over,
  } as ExtractedPage;
}

function facts(over: Partial<SiteFacts> = {}): SiteFacts {
  return {
    domain: "mine.test",
    pages: [page()],
    sitemapUrls: [], hasSitemap: true, robotsDisallow: [], https: true,
    psi: [], brokenUrls: [], areas: ["ภูเก็ต"], areaScope: "province",
    ...over,
  };
}

const rival = (over: Partial<CompetitorFact> = {}): CompetitorFact => ({
  domain: "rival.test", pagesCrawled: 40,
  counts: { service: 10, article: 8, faq: 1 },
  serviceTitles: [], hasFaq: true, notMeasured: false, ...over,
});

const keyword = (over: Partial<KeywordFact> = {}): KeywordFact => ({
  term: "รับล้างแอร์ ภูเก็ต", intent: "transactional", area: "ภูเก็ต",
  volume: 500, checked: true, position: null, ahead: [], paidDomains: [], ...over,
});

// ---------------------------------------------------------------------------
describe("CON-001 — fewer service pages than the market", () => {
  it("fires when we are well under the competitor median", () => {
    const found = con001(facts({ competitors: [rival(), rival({ domain: "b.test" })] }));
    expect(found).toHaveLength(1);
    expect(found[0]!.evidence.service_pages).toBe(1);
    expect(found[0]!.evidence.competitor_median).toBe(10);
  });

  it("stays quiet when we are in the same range", () => {
    const pages = Array.from({ length: 8 }, (_, i) =>
      page({ url: `https://mine.test/s${i}` }));
    expect(con001(facts({ pages, competitors: [rival(), rival({ domain: "b.test" })] })))
      .toEqual([]);
  });

  it("says nothing when no competitor was crawled", () => {
    expect(con001(facts({ competitors: [] }))).toEqual([]);
    expect(con001(facts())).toEqual([]);
  });

  it("ignores a competitor whose robots.txt closed the site", () => {
    expect(con001(facts({ competitors: [rival({ notMeasured: true, counts: {} })] })))
      .toEqual([]);
  });
});

describe("CON-002 — a local business with no page about its area", () => {
  it("fires for a province-scoped business with no location page", () => {
    const found = con002(facts());
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe("critical");
    expect(found[0]!.evidence.areas).toEqual(["ภูเก็ต"]);
  });

  it("stays quiet once there is a location page", () => {
    expect(con002(facts({ pages: [page({ pageType: "location" })] }))).toEqual([]);
  });

  it("does not apply to a nationwide business", () => {
    expect(con002(facts({ areaScope: "nationwide" }))).toEqual([]);
  });

  it("does not fire when the scope was never established", () => {
    // Unknown is not the same as local, and this finding is critical.
    expect(con002(facts({ areaScope: undefined }))).toEqual([]);
  });

  it("records that the area is at least mentioned, so the fix is accurate", () => {
    const found = con002(facts({
      pages: [page({ title: "รับล้างแอร์ ภูเก็ต", h1: ["รับล้างแอร์ ภูเก็ต"] })],
    }));
    expect(found[0]!.evidence.pages_mentioning_area).toBe(1);
  });
});

describe("CON-003 — fewer articles than the market", () => {
  it("fires when competitors publish and we do not", () => {
    expect(con003(facts({ competitors: [rival(), rival({ domain: "b.test" })] })))
      .toHaveLength(1);
  });

  it("stays quiet when nobody in the market publishes either", () => {
    const quiet = rival({ counts: { service: 10, article: 0 } });
    expect(con003(facts({ competitors: [quiet, rival({ domain: "b.test", counts: { article: 0 } })] })))
      .toEqual([]);
  });
});

describe("CON-004 — no FAQ at all", () => {
  it("fires when there is no FAQ page and no FAQ markup", () => {
    expect(con004(facts())).toHaveLength(1);
  });

  it("stays quiet when there is an FAQ page", () => {
    expect(con004(facts({ pages: [page({ pageType: "faq" })] }))).toEqual([]);
  });

  it("stays quiet when FAQ markup exists without a dedicated page", () => {
    expect(con004(facts({ pages: [page({ schemaTypes: ["FAQPage"] })] }))).toEqual([]);
  });

  it("names the competitors who do have one", () => {
    const found = con004(facts({ competitors: [rival({ hasFaq: true })] }));
    expect(found[0]!.evidence.competitors_with_faq).toEqual(["rival.test"]);
  });
});

describe("CON-005 — a buying keyword with no page behind it", () => {
  it("fires and names the keyword", () => {
    const found = con005(facts({ keywords: [keyword({ term: "ล้างเครื่องซักผ้า" })] }));
    expect(found).toHaveLength(1);
    expect(found[0]!.evidence.uncovered_keywords).toEqual([
      { term: "ล้างเครื่องซักผ้า", volume: 500, area: "ภูเก็ต" },
    ]);
  });

  it("stays quiet when a page already covers the term", () => {
    const found = con005(facts({
      pages: [page({ title: "รับล้างแอร์ ภูเก็ต ราคาถูก" })],
      keywords: [keyword({ term: "รับล้างแอร์ ภูเก็ต" })],
    }));
    expect(found).toEqual([]);
  });

  it("matches Thai without spaces, where word splitting would fail", () => {
    // "ล้างแอร์" sits inside "รับล้างแอร์บ้าน" with no space anywhere.
    const found = con005(facts({
      pages: [page({ title: "รับล้างแอร์บ้าน" })],
      keywords: [keyword({ term: "ล้างแอร์" })],
    }));
    expect(found).toEqual([]);
  });

  /**
   * A real false positive from the first live run. The page had the service in
   * its H1 and the area in its title — covered, but not as one contiguous
   * string — and the rule told the owner to write a page they already had.
   */
  it("counts a page that has the service and the area in different places", () => {
    const found = con005(facts({
      pages: [page({
        title: "บริการทำความสะอาดบ้าน ภูเก็ต",
        h1: ["ทำความสะอาดแบบล้ำลึก"],
      })],
      keywords: [keyword({ term: "ทำความสะอาดแบบล้ำลึก ภูเก็ต", area: "ภูเก็ต" })],
    }));
    expect(found).toEqual([]);
  });

  it("still fires when the area is there but the service is not", () => {
    const found = con005(facts({
      pages: [page({ title: "บริการทำความสะอาดบ้าน ภูเก็ต", h1: ["ทำความสะอาดบ้าน"] })],
      keywords: [keyword({ term: "กำจัดปลวก ภูเก็ต", area: "ภูเก็ต" })],
    }));
    expect(found).toHaveLength(1);
  });

  it("still fires when the service is there but the area is not", () => {
    const found = con005(facts({
      pages: [page({ title: "รับกำจัดปลวก", h1: ["รับกำจัดปลวก"] })],
      keywords: [keyword({ term: "รับกำจัดปลวก เชียงใหม่", area: "เชียงใหม่" })],
    }));
    expect(found).toHaveLength(1);
  });

  it("ignores research keywords — those are not lost customers", () => {
    expect(con005(facts({
      keywords: [keyword({ term: "วิธีล้างแอร์เอง", intent: "informational" })],
    }))).toEqual([]);
  });

  it("says nothing when no keyword data was collected", () => {
    expect(con005(facts({ keywords: [] }))).toEqual([]);
    expect(con005(facts())).toEqual([]);
  });

  it("puts the highest-volume gap first", () => {
    const found = con005(facts({
      keywords: [
        keyword({ term: "เล็ก", volume: 10 }),
        keyword({ term: "ใหญ่", volume: 9000 }),
      ],
    }));
    const gaps = found[0]!.evidence.uncovered_keywords as { term: string }[];
    expect(gaps[0]!.term).toBe("ใหญ่");
  });
});

// ---------------------------------------------------------------------------
describe("CMP-001 — one rival beats us repeatedly", () => {
  const losing = (n: number, domain = "rival.test") =>
    Array.from({ length: n }, (_, i) =>
      keyword({ term: `k${i}`, position: null, ahead: [{ domain, position: 2 }] }));

  it("fires when the same domain outranks us often enough", () => {
    const found = cmp001(facts({ keywords: losing(6) }));
    expect(found).toHaveLength(1);
    expect(found[0]!.evidence.competitor).toBe("rival.test");
    expect(found[0]!.evidence.keywords_lost).toBe(6);
  });

  it("stays quiet when the losses are spread across many domains", () => {
    const spread = Array.from({ length: 9 }, (_, i) =>
      keyword({ term: `k${i}`, ahead: [{ domain: `r${i}.test`, position: 2 }] }));
    expect(cmp001(facts({ keywords: spread }))).toEqual([]);
  });

  it("does not count keywords where we are already on page one", () => {
    const winning = losing(6).map((k) => ({ ...k, position: 3 }));
    expect(cmp001(facts({ keywords: winning }))).toEqual([]);
  });

  it("ignores a rival sitting on page two", () => {
    const deep = losing(6).map((k) => ({
      ...k, ahead: [{ domain: "rival.test", position: 45 }],
    }));
    expect(cmp001(facts({ keywords: deep }))).toEqual([]);
  });

  it("says nothing without ranking data", () => {
    expect(cmp001(facts())).toEqual([]);
  });
});

describe("CMP-002 — rivals sell something we do not", () => {
  const withTitles = (domain: string, titles: string[]) =>
    rival({ domain, serviceTitles: titles });

  it("fires when two rivals share a service we lack", () => {
    const found = cmp002(facts({
      competitors: [
        withTitles("a.test", ["รับกำจัดปลวก"]),
        withTitles("b.test", ["รับกำจัดปลวก"]),
      ],
    }));
    expect(found).toHaveLength(1);
    const missing = found[0]!.evidence.missing_services as { title: string }[];
    expect(missing[0]!.title).toBe("รับกำจัดปลวก");
  });

  it("ignores a service only one rival offers — a niche is not a gap", () => {
    expect(cmp002(facts({
      competitors: [withTitles("a.test", ["รับกำจัดปลวก"]), withTitles("b.test", ["อื่น ๆ"])],
    }))).toEqual([]);
  });

  it("stays quiet about a service we already have", () => {
    expect(cmp002(facts({
      pages: [page({ title: "รับกำจัดปลวก", h1: ["รับกำจัดปลวก"] })],
      competitors: [withTitles("a.test", ["รับกำจัดปลวก"]), withTitles("b.test", ["รับกำจัดปลวก"])],
    }))).toEqual([]);
  });

  it("needs at least two measured rivals before comparing at all", () => {
    expect(cmp002(facts({ competitors: [withTitles("a.test", ["x"])] }))).toEqual([]);
  });
});

describe("CMP-003 — rivals are paying for terms we do not rank for", () => {
  it("fires and counts the advertisers", () => {
    const found = cmp003(facts({
      keywords: [keyword({ paidDomains: ["ads.test"], position: null })],
    }));
    expect(found).toHaveLength(1);
    expect(found[0]!.evidence.advertisers).toEqual([{ domain: "ads.test", keywords: 1 }]);
  });

  it("stays quiet when we already rank on page one for that term", () => {
    expect(cmp003(facts({
      keywords: [keyword({ paidDomains: ["ads.test"], position: 2 })],
    }))).toEqual([]);
  });

  it("stays quiet when the advertiser is us", () => {
    expect(cmp003(facts({
      keywords: [keyword({ paidDomains: ["mine.test"], position: null })],
    }))).toEqual([]);
  });

  it("says nothing when nobody is advertising", () => {
    expect(cmp003(facts({ keywords: [keyword()] }))).toEqual([]);
  });
});

describe("median", () => {
  it("takes the middle of an odd list", () => {
    expect(median([1, 9, 3])).toBe(3);
  });
  it("averages the middle pair of an even list", () => {
    expect(median([2, 4, 6, 8])).toBe(5);
  });
  it("is 0 for an empty list", () => {
    expect(median([])).toBe(0);
  });
  it("is not dragged up by one enormous competitor", () => {
    expect(median([3, 4, 400])).toBe(4);
  });
});
