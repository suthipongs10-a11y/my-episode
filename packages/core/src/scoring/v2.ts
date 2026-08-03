/**
 * Scoring, version 2.
 *
 * One change from v1, and the reason it is a new file rather than an edit is
 * project rule #2: runs record the version that produced them, so v1 has to
 * keep meaning what it meant when a customer was shown a number.
 *
 * ## What changed, and why
 *
 * v1's `visibilityScore` returns **0** when there is no ranking data:
 *
 *     if (!v || v.keywordsChecked === 0) return 0; // not ranking is a real result
 *
 * That is right when we looked and found nothing, and wrong when we never
 * looked. DataForSEO credentials are optional — an audit runs perfectly well
 * without them — so before M3 was wired, and on any run without a key, every
 * site scored 0 on a fifteen-percent-weighted category that had not been
 * measured at all. The owner reads a depressed overall score and cannot act on
 * it, because there is nothing wrong.
 *
 * v2 distinguishes the two:
 *
 *   - never checked        -> 50, the same "unknown" v1 already uses for GBP
 *   - checked, nothing ranks -> 0, which is a real and useful result
 *
 * Everything else is imported from v1 unchanged, so the difference between the
 * versions is exactly what you can read on this page. That works because v1 is
 * frozen; if that rule is ever broken, this file inherits the breakage.
 */
import {
  conversionScore, contentScore, localScore, onpageScore, technicalScore,
  WEIGHTS, type Scores, type ScoringInput,
} from "./v1.ts";
import { fetchedPages, ownPages, servicePages } from "../rules/context.ts";

export const SCORING_VERSION = 2;
export { WEIGHTS, type Scores, type ScoringInput };

export function score(input: ScoringInput): Scores {
  const technical = technicalScore(input);
  const onpage = onpageScore(input);
  const conversion = conversionScore(input);
  const local = localScore(input);
  const content = contentScore(input);
  const visibility = visibilityScore(input);

  const overall =
    conversion * WEIGHTS.conversion +
    local * WEIGHTS.local +
    content * WEIGHTS.content +
    visibility * WEIGHTS.visibility +
    onpage * WEIGHTS.onpage +
    technical * WEIGHTS.technical;

  return {
    overall: Math.round(overall),
    technical: Math.round(technical),
    onpage: Math.round(onpage),
    conversion: Math.round(conversion),
    local: Math.round(local),
    content: Math.round(content),
    visibility: Math.round(visibility),
  };
}

/**
 * The one changed formula.
 *
 * `keywordsChecked === 0` means the stage ran and had nothing to check, which
 * is still "not measured" — a site we could not build a keyword list for tells
 * us nothing about how it ranks.
 */
export function visibilityScore(f: ScoringInput): number {
  const v = f.visibility;
  if (!v || v.keywordsChecked === 0) return 50; // unknown, not zero
  const raw =
    (v.inTop10 / v.keywordsChecked) * 60 + (v.inTop3 / v.keywordsChecked) * 40;
  return Math.max(0, Math.min(100, raw));
}

/** Everything scoring looked at, so a report can show its working. */
export function scoreInputs(f: ScoringInput) {
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
  };
}
