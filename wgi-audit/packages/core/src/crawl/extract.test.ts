import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countWords, extractPage, looksAllStock, sameDomain } from "./extract.ts";

const FIXTURES = fileURLToPath(new URL("../../../../fixtures/", import.meta.url));
const fixture = (p: string) => readFileSync(join(FIXTURES, p), "utf8");

const BAD = "https://phuketmaidservice.com/";
const domain = "phuketmaidservice.com";

describe("countWords", () => {
  it("counts Latin words by whitespace", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("counts Thai by characters, since Thai has no spaces between words", () => {
    // Splitting on whitespace would call this one word and every
    // content-length rule would fire on every Thai site.
    const thai = "เราให้บริการทำความสะอาดบ้านและคอนโดในจังหวัดภูเก็ต";
    expect(countWords(thai)).toBeGreaterThan(8);
  });

  it("handles a mix", () => {
    expect(countWords("Deep Cleaning ทำความสะอาดแบบล้ำลึก")).toBeGreaterThan(2);
  });

  it("is zero for empty text", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("sameDomain", () => {
  it("matches the domain and its subdomains, not lookalikes", () => {
    expect(sameDomain("https://phuketmaidservice.com/a", domain)).toBe(true);
    expect(sameDomain("https://www.phuketmaidservice.com/a", domain)).toBe(true);
    expect(sameDomain("https://blog.phuketmaidservice.com/a", domain)).toBe(true);
    expect(sameDomain("https://notphuketmaidservice.com/a", domain)).toBe(false);
    expect(sameDomain("https://other.com/a", domain)).toBe(false);
  });
});

describe("extractPage — the site with problems", () => {
  const page = extractPage(BAD, fixture("phuketmaid/index.html"), { domain });

  it("reads the title and description", () => {
    expect(page.title).toBe("บริการทำความสะอาดบ้าน ภูเก็ต");
    expect(page.metaDesc).toContain("ภูเก็ต");
  });

  it("finds one H1", () => {
    expect(page.h1Count).toBe(1);
  });

  it("sees the phone number is not a link — the highest-impact finding", () => {
    expect(page.hasTelLink).toBe(false);
  });

  it("sees there is no LINE contact", () => {
    expect(page.hasLineLink).toBe(false);
  });

  it("notices no viewport, so the site is not mobile-ready", () => {
    expect(page.hasViewport).toBe(false);
  });

  it("finds no structured data", () => {
    expect(page.schemaTypes).toEqual([]);
  });

  it("counts internal links and separates them from external", () => {
    expect(page.internalLinks).toBe(3);
    expect(page.externalLinks).toBe(0);
  });

  it("records image hosts so stock photography is detectable", () => {
    expect(page.imageHosts).toContain("images.unsplash.com");
    expect(looksAllStock(page.imageHosts)).toBe(true);
  });

  it("counts images missing alt text", () => {
    expect(page.imagesTotal).toBe(2);
    expect(page.imagesNoAlt).toBe(2);
  });

  it("finds no call to action above the fold", () => {
    expect(page.hasAboveFoldCta).toBe(false);
  });
});

describe("extractPage — forms", () => {
  const page = extractPage(BAD + "contact/", fixture("phuketmaid/contact.html"), { domain });

  it("counts fields a visitor must fill, ignoring hidden and submit", () => {
    expect(page.hasForm).toBe(true);
    expect(page.formFieldCount).toBe(6);
  });
});

describe("extractPage — duplicate headings", () => {
  const page = extractPage(
    BAD + "services/deep-cleaning/",
    fixture("phuketmaid/services-deep-cleaning.html"),
    { domain },
  );

  it("counts both H1s", () => {
    expect(page.h1Count).toBe(2);
  });

  it("keeps the duplicate title so ONP-002 can see it", () => {
    expect(page.title).toBe("บริการทำความสะอาดบ้าน ภูเก็ต");
  });
});

describe("extractPage — the site done well", () => {
  const page = extractPage(
    "https://goodsite.com/", fixture("goodsite/index.html"), { domain: "goodsite.com" },
  );

  it("finds the tap-to-call link", () => {
    expect(page.hasTelLink).toBe(true);
  });

  it("finds LINE", () => {
    expect(page.hasLineLink).toBe(true);
  });

  it("counts a LINE Official Account short link (lin.ee) as a LINE button", () => {
    const html = `<html><body><h1>ร้านของเรา</h1>
      <p>ทักเราได้ที่ <a href="https://lin.ee/abc123">เพิ่มเพื่อน</a></p></body></html>`;
    const p = extractPage("https://shop.example/", html, { domain: "shop.example" });
    expect(p.hasLineLink).toBe(true);
    expect(p.socialLinks.line).toBe("https://lin.ee/abc123");
  });

  it("reads JSON-LD including nested types", () => {
    expect(page.schemaTypes).toContain("LocalBusiness");
    expect(page.schemaTypes).toContain("AggregateRating");
    expect(page.schemaTypes).toContain("PostalAddress");
  });

  it("sees a price and a review", () => {
    expect(page.hasPrice).toBe(true);
    expect(page.hasReview).toBe(true);
  });

  it("sees the CTA above the fold and the sticky bar", () => {
    expect(page.hasAboveFoldCta).toBe(true);
    expect(page.hasStickyCta).toBe(true);
  });

  it("has viewport and alt text", () => {
    expect(page.hasViewport).toBe(true);
    expect(page.imagesNoAlt).toBe(0);
  });

  it("does not look like stock photography", () => {
    expect(looksAllStock(page.imageHosts)).toBe(false);
  });
});

describe("extractPage — resilience", () => {
  it("survives broken JSON-LD by reading the declared types out of the text", () => {
    const html = `<html><head><script type="application/ld+json">
      {"@type":"LocalBusiness", "name": "x",,}</script></head><body></body></html>`;
    const page = extractPage("https://x.com/", html, { domain: "x.com" });
    expect(page.schemaTypes).toContain("LocalBusiness");
  });

  it("reads microdata as well as JSON-LD", () => {
    const html = `<html><body><div itemtype="https://schema.org/FAQPage"></div></body></html>`;
    const page = extractPage("https://x.com/", html, { domain: "x.com" });
    expect(page.schemaTypes).toContain("FAQPage");
  });

  it("ignores script and style text in the word count", () => {
    const html = `<html><body><script>var a = "aaa bbb ccc ddd eee";</script>
      <p>one two</p></body></html>`;
    const page = extractPage("https://x.com/", html, { domain: "x.com" });
    expect(page.wordCount).toBe(2);
  });

  it("handles a page with nothing in it", () => {
    const page = extractPage("https://x.com/", "", { domain: "x.com" });
    expect(page.wordCount).toBe(0);
    expect(page.h1Count).toBe(0);
    expect(page.title).toBeNull();
  });

  it("detects mixed content only on https pages", () => {
    const html = `<html><body><img src="http://x.com/a.jpg"></body></html>`;
    expect(extractPage("https://x.com/", html, { domain: "x.com" }).hasMixedContent).toBe(true);
    expect(extractPage("http://x.com/", html, { domain: "x.com" }).hasMixedContent).toBe(false);
  });

  it("reads noindex from the robots meta tag", () => {
    const html = `<html><head><meta name="robots" content="noindex, follow"></head><body></body></html>`;
    expect(extractPage("https://x.com/", html, { domain: "x.com" }).isNoindex).toBe(true);
  });
});
