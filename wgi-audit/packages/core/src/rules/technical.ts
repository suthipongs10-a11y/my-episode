/**
 * TEC — technical rules.
 *
 * These are the checks that decide whether Google can see the site at all, so
 * a failure here makes every other improvement pointless. TEC-005 and TEC-007
 * are critical for that reason: a site Google cannot crawl, or that is unusable
 * on the phone every Thai customer is holding, has no route to a lead.
 */
import type { Finding } from "../types/index.ts";
import { fetchedPages, finding, homepage, ownPages, pct, type Rule, type SiteFacts } from "./context.ts";
import { isAllowed, parseRobots } from "../http/cached-fetch.ts";

const PSI_MIN_SCORE = 50;
const LCP_MAX_SECONDS = 4;
const INDEX_RATIO_MIN = 0.5;

/** TEC-001 — no HTTPS, or https pages loading http resources. */
export const tec001: Rule = (facts) => {
  const mixed = fetchedPages(facts).filter((p) => p.hasMixedContent);
  if (facts.https && mixed.length === 0) return [];
  return [
    finding(
      "TEC-001",
      {
        https: facts.https,
        pages_with_mixed_content: mixed.length,
        pages_total: fetchedPages(facts).length,
      },
      mixed.map((p) => p.url),
    ),
  ];
};

/** TEC-002 — slow on mobile. */
export const tec002: Rule = (facts) => {
  const scored = facts.psi.filter((p) => p.performanceScore !== null);
  if (scored.length === 0) return [];
  const worst = scored.reduce((a, b) =>
    (a.performanceScore ?? 100) <= (b.performanceScore ?? 100) ? a : b,
  );
  if ((worst.performanceScore ?? 100) >= PSI_MIN_SCORE) return [];
  return [
    finding(
      "TEC-002",
      {
        worst_score: worst.performanceScore,
        worst_url: worst.url,
        threshold: PSI_MIN_SCORE,
        pages_measured: scored.length,
      },
      scored.filter((p) => (p.performanceScore ?? 100) < PSI_MIN_SCORE).map((p) => p.url),
    ),
  ];
};

/** TEC-003 — main content takes too long to appear on mobile. */
export const tec003: Rule = (facts) => {
  const withLcp = facts.psi.filter((p) => p.lcpSeconds !== null);
  const slow = withLcp.filter((p) => (p.lcpSeconds ?? 0) > LCP_MAX_SECONDS);
  if (slow.length === 0) return [];
  return [
    finding(
      "TEC-003",
      {
        slow_pages: slow.length,
        pages_measured: withLcp.length,
        worst_lcp_seconds: Math.max(...slow.map((p) => p.lcpSeconds ?? 0)),
        threshold_seconds: LCP_MAX_SECONDS,
      },
      slow.map((p) => p.url),
    ),
  ];
};

/** TEC-004 — no sitemap.xml. */
export const tec004: Rule = (facts) => {
  if (facts.hasSitemap) return [];
  return [finding("TEC-004", { pages_found_by_crawl: ownPages(facts).length })];
};

/**
 * TEC-005 — robots.txt blocks a page that needs to rank.
 *
 * Only pages that earn customers count. A blocked cart or login page is
 * correct configuration, not a problem, and reporting it as one would waste
 * the owner's attention on the one rule they most need to act on.
 */
export const tec005: Rule = (facts) => {
  if (facts.robotsDisallow.length === 0) return [];
  const rules = parseRobots(
    ["User-agent: *", ...facts.robotsDisallow.map((d) => `Disallow: ${d}`)].join("\n"),
    "*",
  );
  const important = fetchedPages(facts).filter((p) =>
    ["home", "service", "location", "contact"].includes(p.pageType),
  );
  const blocked = important.filter((p) => !isAllowed(rules, pathOf(p.url)));
  if (blocked.length === 0) return [];
  return [
    finding(
      "TEC-005",
      {
        blocked_important_pages: blocked.length,
        important_pages_total: important.length,
        disallow_rules: facts.robotsDisallow,
      },
      blocked.map((p) => p.url),
    ),
  ];
};

/** TEC-006 — much of the site is marked noindex or missing from the sitemap. */
export const tec006: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  const indexable = pages.filter((p) => !p.isNoindex);
  const ratio = indexable.length / pages.length;
  if (ratio >= INDEX_RATIO_MIN) return [];
  return [
    finding(
      "TEC-006",
      {
        indexable_pages: indexable.length,
        pages_total: pages.length,
        percent_indexable: pct(indexable.length, pages.length),
        threshold_percent: INDEX_RATIO_MIN * 100,
      },
      pages.filter((p) => p.isNoindex).map((p) => p.url),
    ),
  ];
};

/** TEC-007 — not usable on a phone. */
export const tec007: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  const noViewport = pages.filter((p) => !p.hasViewport);
  // One template usually governs the whole site; a majority failing means the
  // site is not responsive, rather than one page being odd.
  if (noViewport.length <= pages.length / 2) return [];
  return [
    finding(
      "TEC-007",
      {
        pages_without_viewport: noViewport.length,
        pages_total: pages.length,
        homepage_has_viewport: homepage(facts)?.hasViewport ?? null,
      },
      noViewport.map((p) => p.url),
    ),
  ];
};

/** TEC-008 — internal links that lead nowhere. */
export const tec008: Rule = (facts) => {
  if (facts.brokenUrls.length === 0) return [];
  return [
    finding(
      "TEC-008",
      {
        broken_links: facts.brokenUrls.length,
        examples: facts.brokenUrls.slice(0, 5).map((b) => ({
          url: b.url, status: b.status, linked_from: b.linkedFrom[0] ?? null,
        })),
      },
      facts.brokenUrls.map((b) => b.url),
    ),
  ];
};

export const technicalRules: Rule[] = [
  tec001, tec002, tec003, tec004, tec005, tec006, tec007, tec008,
];

export function runTechnical(facts: SiteFacts): Finding[] {
  return technicalRules.flatMap((r) => r(facts));
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
