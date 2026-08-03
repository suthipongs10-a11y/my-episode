/**
 * Seed keywords, and the keyword selection that follows them.
 *
 * The Thai cases are not decoration. Thai writes without spaces between words,
 * so anything that reasons about "words" breaks silently on it, and this
 * product's entire audience writes in Thai.
 */
import { describe, expect, it } from "vitest";
import type { ExtractedPage } from "../crawl/extract.ts";
import { classifyIntent, cleanPhrase, seedKeywords, type SeedKeyword } from "./seed.ts";
import { pick } from "../pipeline/06-keywords.ts";

function page(over: Partial<ExtractedPage> = {}): ExtractedPage {
  return {
    url: "https://x.test/a", domain: "x.test", isCompetitor: false, statusCode: 200,
    pageType: "service", title: null, titleLen: 0, metaDesc: null, metaDescLen: 0,
    h1: [], h1Count: 0, wordCount: 400, internalLinks: 5, externalLinks: 0,
    imagesTotal: 0, imagesNoAlt: 0, schemaTypes: [], hasTelLink: false,
    hasLineLink: false, hasForm: false, formFieldCount: 0, hasPrice: false,
    hasReview: false, lang: "th", internalUrls: [], allUrls: [], imageHosts: [],
    hasViewport: true, isNoindex: false, ...over,
  } as ExtractedPage;
}

describe("cleanPhrase", () => {
  it("keeps the service and drops the brand after a separator", () => {
    expect(cleanPhrase("รับทำความสะอาดบ้าน | Phuket Maid", ["phuketmaid"], []))
      .toBe("รับทำความสะอาดบ้าน");
  });

  it("keeps the longest segment when the brand comes first", () => {
    expect(cleanPhrase("Phuket Maid | รับทำความสะอาดบ้านและคอนโด", ["phuketmaid"], []))
      .toBe("รับทำความสะอาดบ้านและคอนโด");
  });

  it("strips the area, because it is added back as its own variant", () => {
    expect(cleanPhrase("รับทำความสะอาดบ้าน ภูเก็ต", [], ["ภูเก็ต"]))
      .toBe("รับทำความสะอาดบ้าน");
  });

  it("drops navigation labels that are not things anyone sells", () => {
    for (const junk of ["หน้าแรก", "ติดต่อเรา", "About Us", "Privacy Policy"]) {
      expect(cleanPhrase(junk, [], []), junk).toBeNull();
    }
  });

  it("drops a whole sentence — a heading is not a search query", () => {
    const sentence = "เราให้บริการทำความสะอาดบ้านและคอนโดครบวงจรทั่วทั้งจังหวัดภูเก็ตด้วยทีมงานมืออาชีพที่ผ่านการอบรม";
    expect(cleanPhrase(sentence, [], [])).toBeNull();
  });

  it("counts Thai length in characters, so a short Thai phrase survives", () => {
    // No spaces at all: a word-splitting length check would see this as 1 word
    // and a byte-based one as far too long.
    expect(cleanPhrase("รับล้างแอร์", [], [])).toBe("รับล้างแอร์");
  });
});

describe("seedKeywords", () => {
  const pages = [
    page({ title: "รับทำความสะอาดบ้าน | Phuket Maid", pageType: "service" }),
    page({ url: "https://x.test/b", title: "รับล้างแอร์ ภูเก็ต", pageType: "service" }),
    page({ url: "https://x.test/c", title: "เกี่ยวกับเรา", pageType: "about" }),
  ];

  it("builds area variants first, because that is what a local site can win", () => {
    const seeds = seedKeywords({
      pages, areas: ["ภูเก็ต"], domain: "phuketmaid.com", businessType: "ทำความสะอาด",
    });
    expect(seeds[0]!.area).toBe("ภูเก็ต");
    expect(seeds.map((s) => s.term)).toContain("รับทำความสะอาดบ้าน ภูเก็ต");
    expect(seeds.map((s) => s.term)).toContain("รับทำความสะอาดบ้าน");
  });

  it("ignores pages that are not selling anything", () => {
    const seeds = seedKeywords({ pages, areas: [], domain: "phuketmaid.com" });
    expect(seeds.map((s) => s.term)).not.toContain("เกี่ยวกับเรา");
  });

  it("never reads a competitor's pages", () => {
    const seeds = seedKeywords({
      pages: [...pages, page({ title: "รับจัดสวน", isCompetitor: true })],
      areas: [], domain: "phuketmaid.com",
    });
    expect(seeds.map((s) => s.term)).not.toContain("รับจัดสวน");
  });

  it("still produces a list for a site with no service pages", () => {
    const seeds = seedKeywords({
      pages: [page({ title: "เกี่ยวกับเรา", pageType: "about" })],
      areas: ["ภูเก็ต"], businessType: "ทำความสะอาด", domain: "x.test",
    });
    expect(seeds.map((s) => s.term)).toContain("ทำความสะอาด ภูเก็ต");
  });

  it("produces the same list twice — the pipeline is not an agent", () => {
    const input = { pages, areas: ["ภูเก็ต", "ป่าตอง"], domain: "phuketmaid.com" };
    expect(seedKeywords(input)).toEqual(seedKeywords(input));
  });

  it("emits no duplicates even when title and h1 say the same thing", () => {
    const seeds = seedKeywords({
      pages: [page({ title: "รับล้างแอร์", h1: ["รับล้างแอร์"] })],
      areas: ["ภูเก็ต"], domain: "x.test",
    });
    const terms = seeds.map((s) => s.term);
    expect(new Set(terms).size).toBe(terms.length);
  });
});

describe("classifyIntent", () => {
  it("treats a bare service-plus-area query as someone ready to hire", () => {
    expect(classifyIntent("ทำความสะอาดบ้าน ภูเก็ต")).toBe("transactional");
  });

  it("spots a research question in Thai", () => {
    expect(classifyIntent("วิธีล้างแอร์ด้วยตัวเอง")).toBe("informational");
    expect(classifyIntent("ล้างแอร์กับเปลี่ยนแอร์ต่างกันอย่างไร")).toBe("informational");
  });

  it("spots a brand search", () => {
    expect(classifyIntent("phuketmaid ราคา", ["phuketmaid"])).toBe("navigational");
  });

  it("prefers the buying signal on a price query", () => {
    expect(classifyIntent("ราคาล้างแอร์")).toBe("transactional");
  });
});

describe("pick", () => {
  const kw = (term: string, intent: SeedKeyword["intent"]): SeedKeyword =>
    ({ term, area: null, intent });

  it("puts buying keywords ahead of research ones, whatever the volume", () => {
    const all = [kw("วิธีล้างแอร์", "informational"), kw("รับล้างแอร์", "transactional")];
    const volumes = new Map([["วิธีล้างแอร์", 90_000], ["รับล้างแอร์", 100]]);
    expect(pick(all, volumes, 10)[0]!.term).toBe("รับล้างแอร์");
  });

  it("sorts by real volume within the same intent", () => {
    const all = [kw("a", "transactional"), kw("b", "transactional")];
    expect(pick(all, new Map([["a", 10], ["b", 900]]), 10).map((k) => k.term))
      .toEqual(["b", "a"]);
  });

  it("keeps the seed order when nobody measured volume", () => {
    const all = [kw("first", "transactional"), kw("second", "transactional")];
    expect(pick(all, new Map(), 10).map((k) => k.term)).toEqual(["first", "second"]);
  });

  it("ranks an unmeasured keyword below a measured one, not above", () => {
    const all = [kw("unknown", "transactional"), kw("measured", "transactional")];
    expect(pick(all, new Map([["measured", 10]]), 10).map((k) => k.term))
      .toEqual(["measured", "unknown"]);
  });

  it("drops duplicates and honours the limit", () => {
    const all = [kw("a", "transactional"), kw("A", "transactional"), kw("b", "transactional")];
    expect(pick(all, new Map(), 30)).toHaveLength(2);
    expect(pick(all, new Map(), 1)).toHaveLength(1);
  });
});
