/**
 * 07 — SERP positions, and where the competitors come from.
 *
 * Two outputs from one set of calls. The rankings answer "does this site show
 * up for what it sells"; the same result pages answer "who does show up", which
 * is a better competitor list than asking the owner. Owners name the competitor
 * they resent; Google names the one taking the calls.
 *
 * Positions are stored raw. Nothing here decides what a position *means* —
 * that is the rules engine's job in 11, from data that can be re-read later
 * under a different definition of "ranking well".
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { DataForSeo, type SerpRow } from "../serp/dataforseo.ts";
import { normalise } from "../keywords/seed.ts";
import { saveRankings, saveSnapshot, upsertCompetitor } from "../db/queries.ts";
import type { KeywordsResult } from "./06-keywords.ts";

/** How many competitors get crawled in stage 10. Each one costs time. */
export const MAX_COMPETITORS = 3;
/** Below this a domain is a directory or a fluke, not a rival. */
export const MIN_APPEARANCES = 2;
/** Only results this high suggest a competitor worth studying. */
export const COMPETITOR_MAX_POSITION = 20;

export interface SerpResult {
  /** One entry per keyword, whether or not the client appeared. */
  rankings: {
    term: string;
    position: number | null;
    url: string | null;
    /** Rivals above us on this term, nearest first. */
    ahead: { domain: string; position: number }[];
    paidDomains: string[];
  }[];
  competitors: { domain: string; appearances: number; bestPosition: number }[];
  checked: number;
}

export const serpStage: PipelineStage = {
  name: "07-serp",
  async run(ctx: StageContext) {
    const kw = ctx.state.get("keywords") as KeywordsResult | undefined;
    const keywords = kw?.keywords ?? [];

    if (ctx.dryRun || !DataForSeo.configured() || keywords.length === 0) {
      if (!ctx.dryRun && keywords.length > 0 && !DataForSeo.configured()) {
        ctx.log.warn("no DataForSEO credentials: skipping rankings and competitor discovery");
      }
      const empty: SerpResult = { rankings: [], competitors: [], checked: 0 };
      ctx.state.set("serp", empty);
      return;
    }

    const rows = await new DataForSeo(ctx.http, ctx.log).serp(keywords.map((k) => k.term));
    const result = summarise(rows, ctx.client.domain);
    ctx.state.set("serp", result);

    // Persist: one ranking row per keyword we actually got an answer for.
    const byTerm = new Map(keywords.map((k) => [normalise(k.term), k.id]));
    await saveRankings(
      ctx.db, ctx.run.id,
      result.rankings.flatMap((r) => {
        const id = byTerm.get(normalise(r.term));
        if (!id) return [];
        return [{
          keywordId: id,
          engine: "google_web" as const,
          domain: ctx.client.domain,
          position: r.position,
          urlFound: r.url,
        }];
      }),
    );

    for (const c of result.competitors.slice(0, MAX_COMPETITORS)) {
      await upsertCompetitor(ctx.db, ctx.client.id, { domain: c.domain, source: "serp" });
    }

    await saveSnapshot(ctx.db, ctx.run.id, "serp", ctx.client.domain, result);
    ctx.log.info("serp", {
      checked: result.checked,
      ranking: result.rankings.filter((r) => r.position !== null).length,
      competitors: result.competitors.length,
    });
  },
};

/**
 * Turn raw result pages into rankings plus a competitor shortlist.
 *
 * A competitor is a domain that shows up near the top for *several* of the
 * client's own keywords. One appearance is noise — a news article, a directory,
 * a marketplace — and a threshold of two removes almost all of it without
 * needing a blocklist that would go stale.
 */
export function summarise(rows: SerpRow[], clientDomain: string): SerpResult {
  const own = bare(clientDomain);
  const rankings: SerpResult["rankings"] = [];
  const tally = new Map<string, { appearances: number; bestPosition: number }>();

  for (const row of rows) {
    const mine = row.organic.find((o) => bare(o.domain) === own);
    const ahead = row.organic
      .filter((o) => bare(o.domain) !== own)
      .filter((o) => mine === undefined || o.position < mine.position)
      .map((o) => ({ domain: bare(o.domain), position: o.position }));

    rankings.push({
      term: row.keyword,
      position: mine?.position ?? null,
      url: mine?.url ?? null,
      ahead: ahead.slice(0, 10),
      paidDomains: row.paidDomains.map(bare).filter((d) => d !== own),
    });

    for (const o of row.organic) {
      const domain = bare(o.domain);
      if (domain === own || o.position > COMPETITOR_MAX_POSITION) continue;
      const seen = tally.get(domain);
      tally.set(domain, {
        appearances: (seen?.appearances ?? 0) + 1,
        bestPosition: Math.min(seen?.bestPosition ?? 999, o.position),
      });
    }
  }

  const competitors = [...tally.entries()]
    .filter(([domain, t]) => t.appearances >= MIN_APPEARANCES && !isAggregator(domain))
    .map(([domain, t]) => ({ domain, ...t }))
    .sort((a, b) => b.appearances - a.appearances || a.bestPosition - b.bestPosition);

  return { rankings, competitors, checked: rows.length };
}

/**
 * Domains that outrank every small business and teach us nothing.
 *
 * Kept short and obvious on purpose. A long blocklist would be a maintenance
 * burden and would start excluding real local competitors; the appearance
 * threshold above does most of the work.
 */
const AGGREGATORS = [
  "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "twitter.com", "x.com",
  "google.com", "wikipedia.org", "pantip.com", "wongnai.com", "shopee.co.th",
  "lazada.co.th", "linkedin.com", "pinterest.com", "agoda.com", "booking.com",
  "tripadvisor.com", "airbnb.com", "thaimarketplace.com", "blogspot.com",
  "wordpress.com", "medium.com",
];

export function isAggregator(domain: string): boolean {
  const d = bare(domain);
  return AGGREGATORS.some((a) => d === a || d.endsWith("." + a));
}

function bare(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
}
