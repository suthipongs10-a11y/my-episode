/**
 * 09 — Presence: is this business alive, and is it buying traffic?
 *
 * Two questions a seller asks *before* reading an audit, because the answers
 * decide whether the audit is worth reading at all:
 *
 *   - **Alive?** A parked domain or a site whose footer last changed in 2019
 *     is not a lead. Findings against it are technically correct and
 *     commercially worthless.
 *   - **Spending?** A Meta Pixel, a Google Ads conversion tag, or the client's
 *     own domain in paid search results means budget already flows to this
 *     site every month. That turns every conversion finding into "this is what
 *     your ad money leaks through" — the strongest pitch this product has.
 *
 * Everything here is aggregation over what stages 03 and 07 already collected.
 * No network, no cost. The spec also lists Places-derived signals for this
 * stage (opening hours, review recency); those arrive with the Places key in
 * 08-gbp and are folded in here when they exist.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { adsVerdict, type AdPlatform, type AdTag, type SocialPlatform } from "../crawl/signals.ts";
import type { CrawlResult } from "./03-crawl.ts";
import type { IntakeResult } from "./01-intake.ts";
import type { SerpResult } from "./07-serp.ts";

export interface PresenceResult {
  ads: {
    verdict: "yes" | "maybe" | "no";
    platforms: AdPlatform[];
    /** What gave each platform away, for the dashboard. */
    evidence: string[];
    /** The client appeared as an advertiser in Google results. */
    googleSerp: boolean;
    googleSerpTerms: string[];
  };
  social: Partial<Record<SocialPlatform, string>>;
  activity: {
    reachable: boolean;
    parked: boolean;
    copyrightYear: number | null;
    /** How many years behind `now` the footer year is; null when unknown. */
    yearsStale: number | null;
    pagesCrawled: number;
  };
}

export const presenceStage: PipelineStage = {
  name: "09-presence",
  async run(ctx: StageContext) {
    const intake = ctx.state.get("intake") as IntakeResult | undefined;
    const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
    const serp = ctx.state.get("serp") as SerpResult | undefined;

    const result = summarise({
      pages: crawl?.pages ?? [],
      reachable: Boolean(intake && intake.statusCode > 0 && intake.statusCode < 400),
      serp: serp?.rankings ?? [],
    });

    ctx.state.set("presence", result);
    await saveSnapshot(ctx.db, ctx.run.id, "presence", ctx.client.domain, result);
    ctx.log.info("presence", {
      ads: result.ads.verdict,
      platforms: result.ads.platforms.join(",") || "-",
      googleSerp: result.ads.googleSerp,
      social: Object.keys(result.social).join(",") || "-",
      parked: result.activity.parked,
      copyright: result.activity.copyrightYear ?? "-",
    });
  },
};

export interface SummariseInput {
  pages: {
    adTags: AdTag[];
    socialLinks: Partial<Record<SocialPlatform, string>>;
    looksParked: boolean;
    copyrightYear: number | null;
    pageType: string;
    isCompetitor: boolean;
  }[];
  reachable: boolean;
  serp: { term: string; ownPaid: boolean }[];
  now?: Date;
}

/** Pure, so it is testable without a database or a crawl. */
export function summarise(input: SummariseInput): PresenceResult {
  const own = input.pages.filter((p) => !p.isCompetitor);
  const now = input.now ?? new Date();

  // -- ads --------------------------------------------------------------------
  const tags = new Map<AdPlatform, string>();
  for (const p of own) for (const t of p.adTags) if (!tags.has(t.platform)) tags.set(t.platform, t.evidence);
  const allTags: AdTag[] = [...tags].map(([platform, evidence]) => ({ platform, evidence }));
  const serpTerms = input.serp.filter((r) => r.ownPaid).map((r) => r.term);

  let verdict = adsVerdict(allTags);
  if (serpTerms.length > 0) verdict = "yes"; // seen in the auction: no inference needed

  // -- social -----------------------------------------------------------------
  const social: Partial<Record<SocialPlatform, string>> = {};
  for (const p of own) {
    for (const [platform, url] of Object.entries(p.socialLinks) as [SocialPlatform, string][]) {
      if (!social[platform]) social[platform] = url;
    }
  }

  // -- activity ---------------------------------------------------------------
  // Parked only if the *homepage* looks parked. A stray "coming soon" on an
  // inner page is a half-built section, not an abandoned business.
  const home = own.find((p) => p.pageType === "home") ?? own[0];
  const parked = Boolean(home?.looksParked);
  const years = own.map((p) => p.copyrightYear).filter((y): y is number => y !== null);
  const copyrightYear = years.length ? Math.max(...years) : null;
  const yearsStale = copyrightYear === null ? null : Math.max(0, now.getFullYear() - copyrightYear);

  return {
    ads: {
      verdict,
      platforms: allTags.map((t) => t.platform),
      evidence: allTags.map((t) => `${t.platform}: ${t.evidence}`),
      googleSerp: serpTerms.length > 0,
      googleSerpTerms: serpTerms.slice(0, 10),
    },
    social,
    activity: {
      reachable: input.reachable,
      parked,
      copyrightYear,
      yearsStale,
      pagesCrawled: own.length,
    },
  };
}
