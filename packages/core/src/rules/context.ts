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
