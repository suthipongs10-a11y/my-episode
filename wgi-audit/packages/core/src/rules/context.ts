/**
 * What the rules are allowed to look at.
 *
 * Rules are pure functions of this object: no network, no database, no LLM, no
 * clock, no randomness. That is what makes the same site produce the same
 * findings every run, and what lets the whole rules layer be tested against
 * fixtures with nothing else running.
 */
import type { Finding } from "../types/index.ts";
import type { ExtractedPage } from "../crawl/extract.ts";
import type { FindingCode } from "../i18n/th.ts";
import { meta } from "./catalog.ts";

export interface PsiResult {
  url: string;
  performanceScore: number | null;   // 0-100, mobile
  lcpSeconds: number | null;
  clsScore: number | null;
  inpMs: number | null;
}

/** One keyword and where the client sits for it. Collected in 06 and 07. */
export interface KeywordFact {
  term: string;
  intent: string | null;
  area: string | null;
  /** Monthly searches, or null when nobody measured it. Never 0 for "unknown". */
  volume: number | null;
  /**
   * Whether a SERP was actually fetched for this term.
   *
   * Without it, `position: null` means two opposite things — "we looked and the
   * client is nowhere" and "we never looked" — and scoring cannot tell a site
   * that ranks for nothing from one nobody measured.
   */
  checked: boolean;
  /** The client's organic position, null when outside what we looked at. */
  position: number | null;
  /** Rivals ranking above the client on this term. */
  ahead: { domain: string; position: number }[];
  /** Domains advertising on this term. */
  paidDomains: string[];
}

/** What a short crawl of one competitor found. Produced by stage 10. */
export interface CompetitorFact {
  domain: string;
  pagesCrawled: number;
  counts: Record<string, number>;
  serviceTitles: string[];
  hasFaq: boolean;
  /** True when robots.txt closed the site or it did not answer. */
  notMeasured: boolean;
}

export interface SiteFacts {
  domain: string;
  /** Pages of the client's own site, already classified. */
  pages: ExtractedPage[];
  /** Competitor pages, kept apart so client rules never read them. */
  competitorPages?: ExtractedPage[];
  /** URLs listed in sitemap.xml, empty when there is none. */
  sitemapUrls: string[];
  hasSitemap: boolean;
  /** Paths robots.txt disallows, so a blocked service page is detectable. */
  robotsDisallow: string[];
  /** Whether the homepage answered over https. */
  https: boolean;
  psi: PsiResult[];
  /** URLs that returned 4xx/5xx while crawling, for TEC-008. */
  brokenUrls: { url: string; status: number; linkedFrom: string[] }[];
  areas: string[];
  /** How local this business is. CON-002 only applies when it is not nationwide. */
  areaScope?: "nationwide" | "province" | "district";

  /**
   * M3 data. Empty means *not collected* — no DataForSEO key, or the stage was
   * skipped — and every rule below treats that as "say nothing", never as
   * "measured, and the answer is zero". A report that invents a failure for a
   * client whose data we never fetched is worse than one that stays quiet.
   */
  keywords?: KeywordFact[];
  competitors?: CompetitorFact[];
}

/** Competitors we actually managed to read. The others prove nothing. */
export function measuredCompetitors(facts: SiteFacts): CompetitorFact[] {
  return (facts.competitors ?? []).filter((c) => !c.notMeasured);
}

/** The middle value, so one enormous competitor cannot set the bar alone. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
    : (sorted[mid] ?? 0);
}

export type Rule = (facts: SiteFacts) => Finding[];

/**
 * Build a finding, pulling severity, effort and impact from the catalog so a
 * rule cannot quietly disagree with it.
 */
export function finding(
  code: FindingCode,
  evidence: Record<string, unknown>,
  affectedUrls: string[] = [],
): Finding {
  const m = meta(code);
  return {
    code,
    category: m.category,
    severity: m.severity,
    evidence,
    affectedUrls,
    effortHours: m.effortHours,
    impactScore: m.impact,
  };
}

/** Client pages only. Competitor pages must never reach a client-site rule. */
export function ownPages(facts: SiteFacts): ExtractedPage[] {
  return facts.pages.filter((p) => !p.isCompetitor);
}

/** Pages that were fetched successfully — rules should not judge a timeout. */
export function fetchedPages(facts: SiteFacts): ExtractedPage[] {
  return ownPages(facts).filter((p) => !p.fetchError && (p.statusCode ?? 200) < 400);
}

export function servicePages(facts: SiteFacts): ExtractedPage[] {
  return fetchedPages(facts).filter(
    (p) => p.pageType === "service" || p.pageType === "location",
  );
}

export function homepage(facts: SiteFacts): ExtractedPage | undefined {
  return fetchedPages(facts).find((p) => p.pageType === "home");
}

/** Percentage helper that avoids dividing by zero and returns whole numbers. */
export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
