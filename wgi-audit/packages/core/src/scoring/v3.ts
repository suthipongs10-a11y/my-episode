/**
 * Scoring, version 3 — score what you measured, and say how much that was.
 *
 * ## The problem v2 still had
 *
 * v2 stopped scoring an unmeasured category as a *failure* by returning 50
 * instead of 0. That fixed half the bug. The other half is that 50 still goes
 * into the weighted average carrying its full weight, so the overall score is
 * dragged toward the middle by categories nobody looked at.
 *
 * On a real audit with no vendor keys the effect is not subtle. Measured:
 * conversion 78, on-page 82, technical 80. Reported overall: **62** — lower
 * than every single bar on the page, because local (25%), content (20%) and
 * visibility (15%) contributed a placeholder 50 across 60% of the weight.
 * Thirty of those sixty-two points were invented.
 *
 * That is a number nobody can trace to a measurement, which is the thing
 * project rule #1 exists to prevent, and it is also just confusing: an
 * operator looking at three bars in the high seventies and a total of 62
 * reasonably concludes the tool is broken.
 *
 * ## What v3 does
 *
 * The overall score is the weighted average **over measured categories only**,
 * with the weights renormalised to what was actually measured. The same site
 * scores 79 — "of the things we looked at, this is how it did" — and that
 * number moves only when a measurement moves.
 *
 * `coverage()` reports the fraction of the total weight that was measured, so
 * the report can say 79 out of a 40%-complete picture rather than implying the
 * whole story. A high score on thin coverage is a real state and the operator
 * needs to see both halves.
 *
 * Category scores themselves are unchanged from v2 — this is purely how they
 * are combined.
 */
import {
  conversionScore, contentScore, localScore, onpageScore, technicalScore,
  WEIGHTS, type Scores, type ScoringInput,
} from "./v1.ts";
import { visibilityScore } from "./v2.ts";
import { fetchedPages, ownPages, servicePages } from "../rules/context.ts";

export const SCORING_VERSION = 3;
export { WEIGHTS, visibilityScore, type Scores, type ScoringInput };

export type Category = keyof typeof WEIGHTS;

/**
 * Which categories rest on data that was actually collected.
 *
 * conversion, on-page and technical come out of the crawl, which always runs.
 * The other three need a vendor that may not be configured — and "not
 * configured" has to be distinguishable from "measured and bad" all the way
 * to the top-level number, not just in the row.
 */
export function measuredCategories(f: ScoringInput): Set<Category> {
  const out = new Set<Category>(["conversion", "onpage", "technical"]);
  if (f.gbp) out.add("local");
  if (f.competitorPageCounts) out.add("content");
  if (f.visibility && f.visibility.keywordsChecked > 0) out.add("visibility");
  return out;
}

/** The share of the total weight that was measured, 0..1. */
export function coverage(f: ScoringInput): number {
  const measured = measuredCategories(f);
  let sum = 0;
  for (const key of measured) sum += WEIGHTS[key];
  return round2(sum);
}

export function categoryScores(f: ScoringInput): Record<Category, number> {
  return {
    conversion: conversionScore(f),
    local: localScore(f),
    content: contentScore(f),
    visibility: visibilityScore(f),
    onpage: onpageScore(f),
    technical: technicalScore(f),
  };
}

export function score(input: ScoringInput): Scores {
  const parts = categoryScores(input);
  const measured = measuredCategories(input);

  let weighted = 0;
  let weight = 0;
  for (const key of measured) {
    weighted += parts[key] * WEIGHTS[key];
    weight += WEIGHTS[key];
  }

  // Renormalise. `weight` cannot be 0 — the three crawl-based categories are
  // always in the set — but a future version could remove one, and a silent
  // NaN in a customer-facing number is not an acceptable way to find out.
  const overall = weight > 0 ? weighted / weight : 0;

  return {
    overall: Math.round(overall),
    technical: Math.round(parts.technical),
    onpage: Math.round(parts.onpage),
    conversion: Math.round(parts.conversion),
    local: Math.round(parts.local),
    content: Math.round(parts.content),
    visibility: Math.round(parts.visibility),
  };
}

/** Everything scoring looked at, so a report can show its working. */
export function scoreInputs(f: ScoringInput) {
  const measured = [...measuredCategories(f)];
  return {
    scoring_version: SCORING_VERSION,
    pages_total: ownPages(f).length,
    pages_fetched: fetchedPages(f).length,
    service_pages: servicePages(f).length,
    psi_measured: f.psi.length,
    https: f.https,
    has_sitemap: f.hasSitemap,
    has_gbp_data: Boolean(f.gbp),
    has_visibility_data: Boolean(f.visibility),
    has_competitor_data: Boolean(f.competitorPageCounts),
    keywords_checked: f.visibility?.keywordsChecked ?? 0,
    competitors_measured: f.competitorPageCounts?.servicePages.length ?? 0,
    // The two v3 adds: what the overall number is actually an average of.
    measured_categories: measured,
    coverage: coverage(f),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
