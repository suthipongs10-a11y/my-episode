/**
 * CON — Content. What the site does not say that it needs to.
 *
 * Two of these five (CON-002, CON-004) run on the crawl alone, so a site with
 * no API keys configured still gets content findings. The other three compare
 * against competitors or against real keyword data, and stay silent when that
 * data was never collected — see the note on `SiteFacts.keywords`.
 *
 * The comparison is against the **median** competitor, not the best one. A
 * report that says "the market leader has 60 pages, you have 4" is true and
 * useless; "the typical competitor in your results has 12" is a number an
 * owner can act on this month.
 */
import type { Finding } from "../types/index.ts";
import {
  fetchedPages, finding, median, measuredCompetitors, servicePages,
  type Rule, type SiteFacts,
} from "./context.ts";
import { normalise } from "../keywords/seed.ts";

/** Below half the median, a gap is real rather than a rounding difference. */
export const BEHIND_RATIO = 0.5;

/** CON-001 — far fewer service pages than the competitors in the same results. */
export const con001: Rule = (facts) => {
  const rivals = measuredCompetitors(facts);
  if (rivals.length === 0) return [];

  const theirs = rivals.map((c) => (c.counts.service ?? 0) + (c.counts.location ?? 0));
  const bar = median(theirs);
  if (bar === 0) return [];

  const mine = servicePages(facts).length;
  if (mine >= bar * BEHIND_RATIO) return [];

  return [
    finding("CON-001", {
      service_pages: mine,
      competitor_median: bar,
      competitors: rivals.map((c) => ({
        domain: c.domain,
        service_pages: (c.counts.service ?? 0) + (c.counts.location ?? 0),
      })),
    }),
  ];
};

/**
 * CON-002 — the business sells to a named area and has no page about it.
 *
 * Critical, and it fires with no API key at all. A cleaning company in Phuket
 * with no page that says "Phuket" cannot rank for the only search that matters
 * to it, and this is the cheapest finding in the catalogue to act on.
 */
export const con002: Rule = (facts) => {
  // Explicitly local, or nothing. An unknown scope is not a licence to raise a
  // critical finding — "we never established that this business is local" and
  // "this business is local and has no area pages" are different claims, and
  // only the second one is worth waking an owner up for.
  if (facts.areaScope !== "province" && facts.areaScope !== "district") return [];

  const areas = facts.areas.filter((a) => a.trim());
  if (areas.length === 0) return [];

  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  if (pages.some((p) => p.pageType === "location")) return [];

  // A homepage that names the area is thin cover, but it is not nothing —
  // record it so the fix is written as "add pages", not "you never say Phuket".
  const mentions = pages.filter((p) =>
    areas.some((a) => `${p.title ?? ""} ${p.h1.join(" ")}`.includes(a)),
  );

  return [
    finding("CON-002", {
      areas,
      location_pages: 0,
      pages_mentioning_area: mentions.length,
      pages_checked: pages.length,
    }),
  ];
};

/** CON-003 — far fewer articles than the typical competitor. */
export const con003: Rule = (facts) => {
  const rivals = measuredCompetitors(facts);
  if (rivals.length === 0) return [];

  const bar = median(rivals.map((c) => c.counts.article ?? 0));
  if (bar === 0) return [];

  const mine = fetchedPages(facts).filter((p) => p.pageType === "article").length;
  if (mine >= bar * BEHIND_RATIO) return [];

  return [
    finding("CON-003", {
      articles: mine,
      competitor_median: bar,
      competitors: rivals.map((c) => ({ domain: c.domain, articles: c.counts.article ?? 0 })),
    }),
  ];
};

/**
 * CON-004 — no FAQ anywhere.
 *
 * Disjoint from ONP-009 by construction: this is "there is nothing to mark up",
 * that one is "there is, and it is not marked up".
 */
export const con004: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  if (pages.some((p) => p.pageType === "faq")) return [];
  if (pages.some((p) => p.schemaTypes.some((s) => /faq/i.test(s)))) return [];

  const rivals = measuredCompetitors(facts);
  return [
    finding("CON-004", {
      pages_checked: pages.length,
      competitors_with_faq: rivals.filter((c) => c.hasFaq).map((c) => c.domain),
    }),
  ];
};

/**
 * CON-005 — people are searching to buy something the site has no page for.
 *
 * The highest-value content finding in the set, because it names the page to
 * write rather than saying "add content". Restricted to transactional terms:
 * a missing page for "how does air conditioning work" is not a lost customer.
 *
 * Matching is substring-based on purpose. Thai has no spaces between words, so
 * token overlap is not available without a dictionary, and a keyword whose text
 * appears in a page's title or H1 is the same signal either way.
 */
export const con005: Rule = (facts) => {
  const keywords = (facts.keywords ?? []).filter((k) => k.intent === "transactional");
  if (keywords.length === 0) return [];

  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];

  const haystacks = pages
    .filter((p) => p.pageType === "service" || p.pageType === "location" || p.pageType === "home")
    .map((p) => normalise(`${p.title ?? ""} ${p.h1.join(" ")} ${p.url}`));

  const uncovered = keywords
    .filter((k) => normalise(k.term).length >= 3)
    .filter((k) => !haystacks.some((h) => covers(h, k.term, k.area)))
    // Volume first when we have it, so the suggestion list is worth the effort.
    .sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
    .slice(0, 10);

  if (uncovered.length === 0) return [];

  return [
    finding("CON-005", {
      uncovered_keywords: uncovered.map((k) => ({
        term: k.term, volume: k.volume, area: k.area,
      })),
      transactional_keywords: keywords.length,
      service_pages: haystacks.length,
    }),
  ];
};

/**
 * Does this page cover this keyword?
 *
 * The whole phrase is the easy case. Area variants need the second branch, and
 * skipping it produced a real false positive on the first live run: the keyword
 * "ทำความสะอาดแบบล้ำลึก ภูเก็ต" was reported as having no page, on a site whose
 * page carried the service in its H1 and the area in its title. Both parts were
 * there; only the exact adjacency was not.
 *
 * That failure mode matters more than it looks. CON-005 is a `high` finding
 * that tells an owner to write a page — telling them to write one they already
 * have is how a report loses the reader on the page it was supposed to sell on.
 */
export function covers(haystack: string, term: string, area: string | null): boolean {
  const whole = normalise(term);
  if (haystack.includes(whole)) return true;
  if (!area) return false;

  // Same phrase minus the area, which is how 06-keywords built the variant.
  const base = normalise(term.split(area).join(" "));
  return base.length >= 3
    && haystack.includes(base)
    && haystack.includes(normalise(area));
}

export const contentRules: Rule[] = [con001, con002, con003, con004, con005];

export function runContent(facts: SiteFacts): Finding[] {
  return contentRules.flatMap((r) => r(facts));
}
