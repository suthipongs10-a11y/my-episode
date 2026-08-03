/**
 * Rules, against fixtures. Two things matter equally:
 *
 *  - a bad site produces the findings it should
 *  - a good site produces silence
 *
 * The second is the one that gets skipped and the one that decides whether the
 * report is credible. A tool that finds ten problems on a well-built site
 * teaches its reader to ignore it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPage, type ExtractedPage } from "../crawl/extract.ts";
import { classifyExtracted } from "../crawl/classify.ts";
import { runRules, type SiteFacts } from "./index.ts";
import { CATALOG } from "./catalog.ts";
import { th } from "../i18n/th.ts";

const FIXTURES = fileURLToPath(new URL("../../../../fixtures/", import.meta.url));
const fixture = (p: string) => readFileSync(join(FIXTURES, p), "utf8");

const DOMAIN = "phuketmaidservice.com";
const AREAS = ["ภูเก็ต", "ป่าตอง"];

function page(url: string, file: string, domain = DOMAIN): ExtractedPage {
  const p = extractPage(url, fixture(file), { domain });
  p.pageType = classifyExtracted(p, {
    isHomepage: new URL(url).pathname === "/",
    areas: AREAS,
  }).type;
  return p;
}

/** The fixture site, wired up the way the pipeline would. */
function badSite(overrides: Partial<SiteFacts> = {}): SiteFacts {
  return {
    domain: DOMAIN,
    pages: [
      page(`https://${DOMAIN}/`, "phuketmaid/index.html"),
      page(`https://${DOMAIN}/services/deep-cleaning/`, "phuketmaid/services-deep-cleaning.html"),
      page(`https://${DOMAIN}/contact/`, "phuketmaid/contact.html"),
    ],
    sitemapUrls: [],
    hasSitemap: false,
    robotsDisallow: ["/services/", "/wp-admin/"],
    https: true,
    psi: [],
    brokenUrls: [],
    areas: AREAS,
    ...overrides,
  };
}

function goodSite(overrides: Partial<SiteFacts> = {}): SiteFacts {
  const home = page("https://goodsite.com/", "goodsite/index.html", "goodsite.com");
  return {
    domain: "goodsite.com",
    pages: [home],
    sitemapUrls: ["https://goodsite.com/"],
    hasSitemap: true,
    robotsDisallow: [],
    https: true,
    psi: [{ url: "https://goodsite.com/", performanceScore: 92, lcpSeconds: 1.8, clsScore: 0, inpMs: 90 }],
    brokenUrls: [],
    areas: AREAS,
    ...overrides,
  };
}

const codes = (facts: SiteFacts) => runRules(facts).map((f) => f.code);

describe("catalog", () => {
  it("has Thai text for every rule, since the owner reads the report", () => {
    for (const code of Object.keys(CATALOG)) {
      const copy = th.findings[code as keyof typeof th.findings];
      expect(copy, `missing Thai for ${code}`).toBeTruthy();
      expect(copy.title.length).toBeGreaterThan(5);
      expect(copy.fix.length).toBeGreaterThan(5);
    }
  });

  it("keeps headline text free of jargon the owner would not know", () => {
    const jargon = ["schema", "canonical", "crawl", "CTR", "LCP", "on-page"];
    for (const [code, copy] of Object.entries(th.findings)) {
      for (const word of jargon) {
        expect(copy.title.toLowerCase(), `${code} title uses "${word}"`)
          .not.toContain(word.toLowerCase());
      }
    }
  });
});

describe("on-page rules on the fixture site", () => {
  it("finds the page with two H1s", () => {
    const f = runRules(badSite()).find((x) => x.code === "ONP-001");
    expect(f).toBeTruthy();
    expect(f!.evidence["multiple_h1"]).toBe(1);
  });

  it("finds the duplicate title", () => {
    const f = runRules(badSite()).find((x) => x.code === "ONP-002");
    expect(f).toBeTruthy();
    expect(f!.evidence["pages_affected"]).toBe(2);
  });

  it("finds pages with no description", () => {
    const f = runRules(badSite()).find((x) => x.code === "ONP-004");
    expect(f!.evidence["pages_without_meta"]).toBe(2);
  });

  it("finds the thin service page", () => {
    const f = runRules(badSite()).find((x) => x.code === "ONP-005");
    expect(f).toBeTruthy();
    expect(f!.affectedUrls).toContain(`https://${DOMAIN}/services/deep-cleaning/`);
  });

  it("finds images without alt text", () => {
    const f = runRules(badSite()).find((x) => x.code === "ONP-006");
    expect(f!.evidence["percent_missing"]).toBe(100);
  });

  it("says Google cannot tell what the business is", () => {
    expect(codes(badSite())).toContain("ONP-008");
  });
});

describe("technical rules", () => {
  it("reports the site is not usable on a phone", () => {
    expect(codes(badSite())).toContain("TEC-007");
  });

  it("reports the missing sitemap", () => {
    expect(codes(badSite())).toContain("TEC-004");
  });

  it("reports robots.txt blocking the service pages", () => {
    const f = runRules(badSite()).find((x) => x.code === "TEC-005");
    expect(f).toBeTruthy();
    expect(f!.affectedUrls).toContain(`https://${DOMAIN}/services/deep-cleaning/`);
  });

  it("does not report robots.txt for blocking pages that should be blocked", () => {
    // /wp-admin/ and /cart/ being disallowed is correct configuration.
    const facts = badSite({ robotsDisallow: ["/wp-admin/", "/cart/"] });
    expect(codes(facts)).not.toContain("TEC-005");
  });

  it("stays quiet about speed when nothing was measured", () => {
    expect(codes(badSite({ psi: [] }))).not.toContain("TEC-002");
  });

  it("reports a slow page when it was measured", () => {
    const facts = badSite({
      psi: [{ url: `https://${DOMAIN}/`, performanceScore: 31, lcpSeconds: 6.2, clsScore: 0.1, inpMs: 400 }],
    });
    const found = codes(facts);
    expect(found).toContain("TEC-002");
    expect(found).toContain("TEC-003");
  });

  it("reports broken internal links", () => {
    const facts = badSite({
      brokenUrls: [{ url: `https://${DOMAIN}/old/`, status: 404, linkedFrom: [`https://${DOMAIN}/`] }],
    });
    expect(codes(facts)).toContain("TEC-008");
  });

  it("reports no HTTPS", () => {
    expect(codes(badSite({ https: false }))).toContain("TEC-001");
  });
});

describe("conversion rules", () => {
  it("finds the phone number that cannot be tapped", () => {
    const f = runRules(badSite()).find((x) => x.code === "CVR-001");
    expect(f).toBeTruthy();
    expect(f!.evidence["percent_affected"]).toBe(100);
    expect(f!.severity).toBe("critical");
  });

  it("finds no LINE contact", () => {
    expect(codes(badSite())).toContain("CVR-002");
  });

  it("finds no sticky call bar on mobile", () => {
    expect(codes(badSite())).toContain("CVR-003");
  });

  it("finds the form that asks for too much", () => {
    const f = runRules(badSite()).find((x) => x.code === "CVR-004");
    expect(f!.evidence["max_fields_found"]).toBe(6);
  });

  it("finds nothing to click before scrolling", () => {
    expect(codes(badSite())).toContain("CVR-005");
  });

  it("finds no price anywhere", () => {
    expect(codes(badSite())).toContain("CVR-006");
  });

  it("finds no customer reviews", () => {
    expect(codes(badSite())).toContain("CVR-007");
  });

  it("finds the site is entirely stock photography", () => {
    expect(codes(badSite())).toContain("CVR-008");
  });

  it("does not guess at CVR-010 before there is GBP data to compare with", () => {
    expect(codes(badSite())).not.toContain("CVR-010");
  });
});

describe("the site that is done well", () => {
  const found = codes(goodSite());

  it("raises no critical findings", () => {
    const critical = runRules(goodSite()).filter((f) => f.severity === "critical");
    expect(critical.map((f) => f.code)).toEqual([]);
  });

  it("does not complain about the phone, LINE, price, reviews or CTA", () => {
    for (const code of ["CVR-001", "CVR-002", "CVR-003", "CVR-005", "CVR-006", "CVR-007", "CVR-008"]) {
      expect(found, `${code} fired on a good site`).not.toContain(code);
    }
  });

  it("does not complain about structured data or mobile readiness", () => {
    expect(found).not.toContain("ONP-008");
    expect(found).not.toContain("TEC-007");
    expect(found).not.toContain("TEC-004");
  });

  it("stays quiet about speed when the site is fast", () => {
    expect(found).not.toContain("TEC-002");
    expect(found).not.toContain("TEC-003");
  });
});

describe("ordering", () => {
  it("puts critical findings first", () => {
    const findings = runRules(badSite());
    const firstMedium = findings.findIndex((f) => f.severity === "medium");
    const lastCritical = findings.map((f) => f.severity).lastIndexOf("critical");
    expect(lastCritical).toBeLessThan(firstMedium);
  });

  it("puts the tap-to-call fix at the very top — an hour's work, biggest gain", () => {
    expect(runRules(badSite())[0]!.code).toBe("CVR-001");
  });

  it("is stable, so the same site gives the same report twice", () => {
    expect(codes(badSite())).toEqual(codes(badSite()));
  });
});

describe("every finding carries its evidence", () => {
  it("has a non-empty evidence object", () => {
    for (const f of runRules(badSite())) {
      expect(Object.keys(f.evidence).length, `${f.code} has no evidence`).toBeGreaterThan(0);
    }
  });

  it("has effort and impact from the catalog", () => {
    for (const f of runRules(badSite())) {
      expect(f.effortHours, `${f.code}`).toBeGreaterThan(0);
      expect(f.impactScore, `${f.code}`).toBeGreaterThan(0);
    }
  });
});

describe("empty input", () => {
  it("does not throw or invent findings when nothing was crawled", () => {
    const facts = badSite({ pages: [], robotsDisallow: [] });
    expect(() => runRules(facts)).not.toThrow();
    // A site with no pages cannot be judged on its pages; only the
    // site-level checks may speak.
    expect(codes(facts)).not.toContain("ONP-001");
    expect(codes(facts)).not.toContain("CVR-001");
  });
});
