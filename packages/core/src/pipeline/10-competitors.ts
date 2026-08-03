/**
 * 10 — Competitors.
 *
 * A short crawl of the three domains that outrank the client most often, so the
 * report can say "they have 14 service pages and you have 3" instead of "you
 * should add more content". A specific comparison to a named rival is what
 * makes an owner pick up the phone.
 *
 * Fifty pages each, not the client's hundred and fifty. We are answering
 * "how much do they have and of what kind", which converges long before a full
 * crawl — and every page is a second of someone else's bandwidth.
 *
 * **Their robots.txt is honoured in full.** The client invited us; a competitor
 * did not, and the exception in project rule #6 is written for exactly one
 * side of that. A competitor whose robots.txt closes the site is reported as
 * not measured, never as having nothing.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { classifyExtracted } from "../crawl/classify.ts";
import { crawlSite, savePage, MAX_COMPETITOR_PAGES } from "./03-crawl.ts";
import { getCompetitors, saveSnapshot } from "../db/queries.ts";
import type { ExtractedPage } from "../crawl/extract.ts";
import type { SerpResult } from "./07-serp.ts";
import { MAX_COMPETITORS } from "./07-serp.ts";

export interface CompetitorProfile {
  domain: string;
  pagesCrawled: number;
  counts: Record<string, number>;
  /** Titles of their service and location pages — CMP-002 diffs these. */
  serviceTitles: string[];
  hasFaq: boolean;
  /** True when we got nothing: robots.txt, or the site was down. */
  notMeasured: boolean;
}

export interface CompetitorsResult {
  profiles: CompetitorProfile[];
  pages: ExtractedPage[];
}

export const competitorsStage: PipelineStage = {
  name: "10-competitors",
  async run(ctx: StageContext) {
    const domains = await pickDomains(ctx);
    if (ctx.dryRun || domains.length === 0) {
      ctx.state.set("competitors", { profiles: [], pages: [] } as CompetitorsResult);
      if (!ctx.dryRun) ctx.log.info("no competitors to crawl");
      return;
    }

    const profiles: CompetitorProfile[] = [];
    const allPages: ExtractedPage[] = [];

    for (const domain of domains) {
      const result = await crawlSite(ctx, {
        domain,
        // Both schemes, like intake does for the client. A competitor still on
        // plain http would otherwise come back as "not measured", and the
        // report would compare us against a blank.
        seeds: [`https://${domain}/`, `http://${domain}/`],
        maxPages: MAX_COMPETITOR_PAGES,
        respectRobots: true, // they did not ask for this
        isCompetitor: true,
      });

      for (const page of result.pages) {
        page.pageType = classifyExtracted(page, {
          isHomepage: isRoot(page.url),
          areas: ctx.client.areas ?? [],
        }).type;
        await savePage(ctx, page);
      }

      profiles.push(profile(domain, result.pages));
      allPages.push(...result.pages);
      ctx.log.info("competitor crawled", { domain, pages: result.pages.length });
    }

    const out: CompetitorsResult = { profiles, pages: allPages };
    ctx.state.set("competitors", out);
    await saveSnapshot(ctx.db, ctx.run.id, "competitor", ctx.client.domain, profiles);
    ctx.log.info("competitors", {
      crawled: profiles.filter((p) => !p.notMeasured).length,
      blocked: profiles.filter((p) => p.notMeasured).length,
    });
  },
};

/**
 * Competitors already saved by 07-serp, falling back to whatever the SERP
 * stage found in memory. A domain an operator added by hand outranks a
 * discovered one — that is a deliberate human judgement about who matters.
 */
async function pickDomains(ctx: StageContext): Promise<string[]> {
  const stored = await getCompetitors(ctx.db, ctx.client.id);
  if (stored.length > 0) return stored.slice(0, MAX_COMPETITORS).map((c) => c.domain);

  const serp = ctx.state.get("serp") as SerpResult | undefined;
  return (serp?.competitors ?? []).slice(0, MAX_COMPETITORS).map((c) => c.domain);
}

export function profile(domain: string, pages: ExtractedPage[]): CompetitorProfile {
  const counts: Record<string, number> = {};
  for (const p of pages) counts[p.pageType] = (counts[p.pageType] ?? 0) + 1;

  return {
    domain,
    pagesCrawled: pages.length,
    counts,
    serviceTitles: pages
      .filter((p) => p.pageType === "service" || p.pageType === "location")
      .map((p) => p.title ?? "")
      .filter(Boolean),
    hasFaq: pages.some(
      (p) => p.pageType === "faq" || p.schemaTypes.some((s) => /faq/i.test(s)),
    ),
    notMeasured: pages.length === 0,
  };
}

function isRoot(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\/$/, "") === "";
  } catch {
    return false;
  }
}
