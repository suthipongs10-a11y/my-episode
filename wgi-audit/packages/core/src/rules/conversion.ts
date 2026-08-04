/**
 * CVR — conversion rules.
 *
 * This is the category that makes the report worth reading. Everything else
 * tells an owner why Google does not send them visitors; these tell them why
 * the visitors they already have do not become phone calls. The findings are
 * also the cheapest to fix, which is what makes the audit convert into work.
 *
 * Weighted highest in the score (25%) for the same reason.
 */
import type { Finding } from "../types/index.ts";
import { looksAllStock } from "../crawl/extract.ts";
import {
  fetchedPages, finding, homepage, pct, servicePages, type Rule, type SiteFacts,
} from "./context.ts";

const MAX_FORM_FIELDS = 4;

/** Pages where a visitor might want to make contact. */
function contactRelevant(facts: SiteFacts) {
  return fetchedPages(facts).filter((p) =>
    ["home", "service", "location", "contact"].includes(p.pageType),
  );
}

/**
 * CVR-001 — the phone number is text, not a link.
 *
 * The single highest-impact finding in the catalog. Most Thai visitors arrive
 * on a phone and want to call; if tapping the number does nothing they leave
 * for a competitor whose number works. One hour of work.
 */
export const cvr001: Rule = (facts) => {
  const pages = contactRelevant(facts);
  if (pages.length === 0) return [];
  const without = pages.filter((p) => !p.hasTelLink);
  if (without.length === 0) return [];
  return [
    finding(
      "CVR-001",
      {
        pages_without_tel_link: without.length,
        pages_total: pages.length,
        percent_affected: pct(without.length, pages.length),
      },
      without.map((p) => p.url),
    ),
  ];
};

/** CVR-002 — no LINE, the channel Thai customers actually prefer. */
export const cvr002: Rule = (facts) => {
  const pages = contactRelevant(facts);
  if (pages.length === 0) return [];
  if (pages.some((p) => p.hasLineLink)) return [];
  return [
    finding("CVR-002", { pages_checked: pages.length }, pages.map((p) => p.url)),
  ];
};

/** CVR-003 — nothing pinned to the screen on mobile. */
export const cvr003: Rule = (facts) => {
  const pages = contactRelevant(facts);
  if (pages.length === 0) return [];
  const without = pages.filter((p) => !p.hasStickyCta);
  if (without.length === 0) return [];
  return [
    finding(
      "CVR-003",
      { pages_without_sticky_cta: without.length, pages_total: pages.length },
      without.map((p) => p.url),
    ),
  ];
};

/** CVR-004 — a form long enough to talk people out of filling it in. */
export const cvr004: Rule = (facts) => {
  const withForms = fetchedPages(facts).filter((p) => p.hasForm);
  const long = withForms.filter((p) => p.formFieldCount > MAX_FORM_FIELDS);
  if (long.length === 0) return [];
  return [
    finding(
      "CVR-004",
      {
        pages_with_long_form: long.length,
        pages_with_form: withForms.length,
        max_fields_found: Math.max(...long.map((p) => p.formFieldCount)),
        recommended_max: MAX_FORM_FIELDS,
      },
      long.map((p) => p.url),
    ),
  ];
};

/** CVR-005 — nothing to act on before the visitor scrolls. */
export const cvr005: Rule = (facts) => {
  const pages = contactRelevant(facts);
  if (pages.length === 0) return [];
  const without = pages.filter((p) => !p.hasAboveFoldCta);
  if (without.length === 0) return [];
  return [
    finding(
      "CVR-005",
      { pages_without_cta_above_fold: without.length, pages_total: pages.length },
      without.map((p) => p.url),
    ),
  ];
};

/** CVR-006 — no price anywhere, so every enquiry starts from zero. */
export const cvr006: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  if (pages.some((p) => p.hasPrice)) return [];
  return [finding("CVR-006", { pages_checked: pages.length })];
};

/** CVR-007 — nobody vouching for the business. */
export const cvr007: Rule = (facts) => {
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];
  const hasReviewContent = pages.some((p) => p.hasReview);
  const hasReviewSchema = pages.some((p) =>
    p.schemaTypes.some((t) => ["Review", "AggregateRating", "Rating"].includes(t)),
  );
  if (hasReviewContent || hasReviewSchema) return [];
  return [finding("CVR-007", { pages_checked: pages.length })];
};

/** CVR-008 — every photograph came from a stock library. */
export const cvr008: Rule = (facts) => {
  const pages = fetchedPages(facts);
  const hosts = pages.flatMap((p) => p.imageHosts);
  if (hosts.length === 0) return [];
  if (!looksAllStock(hosts)) return [];
  return [
    finding(
      "CVR-008",
      { image_hosts: [...new Set(hosts)].slice(0, 10), images_total: hosts.length },
      pages.filter((p) => p.imageHosts.length > 0).map((p) => p.url),
    ),
  ];
};

/** CVR-009 — nothing that says this is a real, accountable business. */
export const cvr009: Rule = (facts) => {
  const home = homepage(facts);
  const pages = fetchedPages(facts);
  if (pages.length === 0) return [];

  const hasTrustSchema = pages.some((p) =>
    p.schemaTypes.some((t) => ["Organization", "LocalBusiness"].includes(t)),
  );
  // A business that shows an address and a phone has already done most of it.
  const hasContactDetail = Boolean(home?.hasTelLink) && pages.some((p) => p.pageType === "contact");
  if (hasTrustSchema && hasContactDetail) return [];

  return [
    finding("CVR-009", {
      has_business_schema: hasTrustSchema,
      has_contact_page: pages.some((p) => p.pageType === "contact"),
      homepage_has_phone: Boolean(home?.hasTelLink),
    }),
  ];
};

/**
 * CVR-010 — contact details on the site disagree with Google Business Profile.
 *
 * Needs GBP data, which arrives at M4. Returning nothing until then is correct:
 * a rule that guessed would produce a finding with no evidence behind it.
 */
export const cvr010: Rule = () => [];

export const conversionRules: Rule[] = [
  cvr001, cvr002, cvr003, cvr004, cvr005, cvr006, cvr007, cvr008, cvr009, cvr010,
];

export function runConversion(facts: SiteFacts): Finding[] {
  return conversionRules.flatMap((r) => r(facts));
}

/** How many CVR checks passed, for the conversion score. */
export function conversionChecks(facts: SiteFacts): { passed: number; total: number } {
  // CVR-010 needs GBP data; counting it as failed before M4 would understate
  // every score for a reason the owner cannot act on.
  const applicable = conversionRules.filter((r) => r !== cvr010);
  const failed = applicable.filter((r) => r(facts).length > 0).length;
  return { passed: applicable.length - failed, total: applicable.length };
}
