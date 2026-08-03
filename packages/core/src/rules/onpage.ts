/**
 * ONP — on-page rules.
 *
 * Every rule returns at most one finding covering the whole site, with the
 * affected URLs listed. Nine findings that each say "this page has no H1" would
 * bury the report; one that says "9 of 14 pages have no main heading, here they
 * are" is what an owner can act on.
 */
import type { Finding } from "../types/index.ts";
import { fetchedPages, finding, homepage, pct, servicePages, type Rule, type SiteFacts } from "./context.ts";

const TITLE_MIN = 20;
const TITLE_MAX = 60;
const SERVICE_MIN_WORDS = 300;
const MIN_INTERNAL_LINKS = 3;
const ALT_MISSING_THRESHOLD = 0.5;

/** ONP-001 — no H1, or more than one. */
export const onp001: Rule = (facts) => {
  const pages = fetchedPages(facts);
  const bad = pages.filter((p) => p.h1Count !== 1);
  if (bad.length === 0) return [];
  return [
    finding(
      "ONP-001",
      {
        pages_with_wrong_h1: bad.length,
        pages_total: pages.length,
        missing_h1: bad.filter((p) => p.h1Count === 0).length,
        multiple_h1: bad.filter((p) => p.h1Count > 1).length,
      },
      bad.map((p) => p.url),
    ),
  ];
};

/** ONP-002 — the same title on two or more pages. */
export const onp002: Rule = (facts) => {
  const pages = fetchedPages(facts).filter((p) => p.title);
  const byTitle = new Map<string, string[]>();
  for (const p of pages) {
    const key = p.title!.trim().toLowerCase();
    byTitle.set(key, [...(byTitle.get(key) ?? []), p.url]);
  }
  const dupes = [...byTitle.entries()].filter(([, urls]) => urls.length >= 2);
  if (dupes.length === 0) return [];

  return [
    finding(
      "ONP-002",
      {
        duplicate_title_groups: dupes.length,
        pages_affected: dupes.reduce((n, [, urls]) => n + urls.length, 0),
        pages_total: pages.length,
        examples: dupes.slice(0, 3).map(([title, urls]) => ({ title, count: urls.length })),
      },
      dupes.flatMap(([, urls]) => urls),
    ),
  ];
};

/** ONP-003 — title too short or too long to read well in results. */
export const onp003: Rule = (facts) => {
  const pages = fetchedPages(facts);
  const bad = pages.filter(
    (p) => !p.title || p.titleLen < TITLE_MIN || p.titleLen > TITLE_MAX,
  );
  if (bad.length === 0) return [];
  return [
    finding(
      "ONP-003",
      {
        pages_with_bad_title: bad.length,
        pages_total: pages.length,
        too_short: bad.filter((p) => (p.titleLen ?? 0) < TITLE_MIN).length,
        too_long: bad.filter((p) => (p.titleLen ?? 0) > TITLE_MAX).length,
        min_chars: TITLE_MIN,
        max_chars: TITLE_MAX,
      },
      bad.map((p) => p.url),
    ),
  ];
};

/** ONP-004 — no meta description. */
export const onp004: Rule = (facts) => {
  const pages = fetchedPages(facts);
  const bad = pages.filter((p) => !p.metaDesc);
  if (bad.length === 0) return [];
  return [
    finding(
      "ONP-004",
      { pages_without_meta: bad.length, pages_total: pages.length },
      bad.map((p) => p.url),
    ),
  ];
};

/** ONP-005 — a service page too thin to answer a buyer's questions. */
export const onp005: Rule = (facts) => {
  const pages = servicePages(facts);
  const thin = pages.filter((p) => p.wordCount < SERVICE_MIN_WORDS);
  if (thin.length === 0) return [];
  return [
    finding(
      "ONP-005",
      {
        thin_service_pages: thin.length,
        service_pages_total: pages.length,
        min_words: SERVICE_MIN_WORDS,
        thinnest_word_count: Math.min(...thin.map((p) => p.wordCount)),
      },
      thin.map((p) => p.url),
    ),
  ];
};

/** ONP-006 — most images have no alt text. */
export const onp006: Rule = (facts) => {
  const pages = fetchedPages(facts).filter((p) => p.imagesTotal > 0);
  const total = pages.reduce((n, p) => n + p.imagesTotal, 0);
  const missing = pages.reduce((n, p) => n + p.imagesNoAlt, 0);
  if (total === 0 || missing / total <= ALT_MISSING_THRESHOLD) return [];
  return [
    finding(
      "ONP-006",
      {
        images_without_alt: missing,
        images_total: total,
        percent_missing: pct(missing, total),
      },
      pages.filter((p) => p.imagesNoAlt > 0).map((p) => p.url),
    ),
  ];
};

/** ONP-007 — a service page that links nowhere else on the site. */
export const onp007: Rule = (facts) => {
  const pages = servicePages(facts);
  const isolated = pages.filter((p) => p.internalLinks < MIN_INTERNAL_LINKS);
  if (isolated.length === 0) return [];
  return [
    finding(
      "ONP-007",
      {
        isolated_service_pages: isolated.length,
        service_pages_total: pages.length,
        min_internal_links: MIN_INTERNAL_LINKS,
      },
      isolated.map((p) => p.url),
    ),
  ];
};

/** ONP-008 — the homepage does not tell Google what the business is. */
export const onp008: Rule = (facts) => {
  const home = homepage(facts);
  if (!home) return [];
  const local = home.schemaTypes.some((t) =>
    ["LocalBusiness", "Organization", "ProfessionalService", "Store"].includes(t) ||
    t.endsWith("Business"),
  );
  if (local) return [];
  return [
    finding(
      "ONP-008",
      { homepage: home.url, schema_types_found: home.schemaTypes },
      [home.url],
    ),
  ];
};

/** ONP-009 — no FAQ structured data anywhere on the site. */
export const onp009: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  if (pages.some((p) => p.schemaTypes.includes("FAQPage"))) return [];
  return [
    finding("ONP-009", {
      pages_checked: pages.length,
      has_faq_page: pages.some((p) => p.pageType === "faq"),
    }),
  ];
};

export const onpageRules: Rule[] = [
  onp001, onp002, onp003, onp004, onp005, onp006, onp007, onp008, onp009,
];

export function runOnpage(facts: SiteFacts): Finding[] {
  return onpageRules.flatMap((r) => r(facts));
}
