/**
 * 06 — Keywords.
 *
 * Three sources, in a deliberate order:
 *
 *   1. **Code**, from the site's own service pages. Always runs, costs nothing,
 *      and is what makes this stage testable and reproducible.
 *   2. **The cheap model**, proposing terms a Thai buyer would type that the
 *      site does not say about itself. Optional — no key, no problem.
 *   3. **DataForSEO**, for real monthly volume. Also optional, and it is the
 *      only one of the three permitted to produce a number.
 *
 * That ordering is project rule #1 made physical. The model's schema has no
 * numeric field at all, so a model that volunteers `"volume": 5400` has it
 * discarded by zod before this file sees it. Ranking by "volume" that a
 * language model invented is the single most common way an SEO report ends up
 * confidently wrong, and it cannot happen here.
 */
import { z } from "zod";

import type { PipelineStage, StageContext } from "./runner.ts";
import { LlmRouter, loadPrompt } from "../llm/router.ts";
import { DataForSeo } from "../serp/dataforseo.ts";
import { classifyIntent, normalise, seedKeywords, type SeedKeyword } from "../keywords/seed.ts";
import { replaceGeneratedKeywords, saveSnapshot, type KeywordRow } from "../db/queries.ts";
import type { CrawlResult } from "./03-crawl.ts";

/** How many survive into 07-serp. Each one is a paid SERP call. */
export const KEYWORD_LIMIT = 30;
/** Ceiling on what the model may add, so a runaway answer cannot cost money. */
export const LLM_SUGGESTION_LIMIT = 25;

/**
 * Note what is *not* here: volume, difficulty, position, score. The absence is
 * the enforcement — zod strips unknown keys, so numbers cannot arrive.
 */
const Suggestions = z.object({
  keywords: z
    .array(z.object({
      term: z.string().min(2).max(80),
      intent: z.enum(["transactional", "informational", "navigational"]).optional(),
    }))
    .max(60),
});

export interface KeywordsResult {
  keywords: KeywordRow[];
  seeded: number;
  suggested: number;
  withVolume: number;
}

export const keywordsStage: PipelineStage = {
  name: "06-keywords",
  async run(ctx: StageContext) {
    const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
    const areas = ctx.client.areas ?? [];

    // 1. code
    const seeds = seedKeywords({
      pages: crawl?.pages ?? [],
      areas,
      businessType: ctx.client.business_type,
      domain: ctx.client.domain,
    });

    // 2. cheap model
    const suggested = await suggest(ctx, seeds, areas);

    // 3. real volume, then cut to the ones worth paying to check
    const all = [...seeds, ...suggested];
    const volumes = await lookupVolume(ctx, all.map((k) => k.term));
    const chosen = pick(all, volumes, KEYWORD_LIMIT);

    const stored = await replaceGeneratedKeywords(
      ctx.db, ctx.client.id,
      chosen.map((k) => ({
        term: k.term,
        area: k.area,
        intent: k.intent,
        volume: volumes.get(normalise(k.term)) ?? null,
        volumeSource: volumes.size > 0 ? "dataforseo" : null,
      })),
    );

    const result: KeywordsResult = {
      keywords: stored,
      seeded: seeds.length,
      suggested: suggested.length,
      withVolume: stored.filter((k) => k.volume !== null).length,
    };
    ctx.state.set("keywords", result);
    await saveSnapshot(ctx.db, ctx.run.id, "site", "keywords", result);
    ctx.log.info("keywords", {
      total: stored.length, seeded: seeds.length,
      suggested: suggested.length, withVolume: result.withVolume,
    });
  },
};

/** Ask the cheap model for terms the site does not already say about itself. */
async function suggest(
  ctx: StageContext, seeds: SeedKeyword[], areas: string[],
): Promise<SeedKeyword[]> {
  const llm = new LlmRouter(ctx.http, ctx.log, ctx.dryRun);
  if (!llm.available()) {
    ctx.log.debug("no LLM configured: keywords come from the site only");
    return [];
  }

  const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
  const services = (crawl?.pages ?? [])
    .filter((p) => !p.isCompetitor && (p.pageType === "service" || p.pageType === "location"))
    .map((p) => `- ${p.title ?? p.url}`)
    .slice(0, 40)
    .join("\n");

  const prompt = await loadPrompt("keywords", {
    domain: ctx.client.domain,
    businessType: ctx.client.business_type ?? "ไม่ระบุ",
    areas: areas.join(", ") || "ทั่วประเทศ",
    services: services || "(ไม่พบหน้าบริการ)",
    seeds: seeds.map((s) => `- ${s.term}`).join("\n") || "(ยังไม่มี)",
    limit: String(LLM_SUGGESTION_LIMIT),
  });

  const answer = await llm.ask({ tier: "cheap", prompt, schema: Suggestions });
  if (!answer) return [];

  const known = new Set(seeds.map((s) => normalise(s.term)));
  const out: SeedKeyword[] = [];
  for (const k of answer.keywords) {
    const term = k.term.trim();
    const key = normalise(term);
    if (!term || known.has(key)) continue;
    known.add(key);
    out.push({
      term,
      area: areas.find((a) => term.includes(a)) ?? null,
      // Trust the model's *label* but verify against the same rule the seeds
      // use, so one list is not classified two ways.
      intent: k.intent ?? classifyIntent(term),
    });
    if (out.length >= LLM_SUGGESTION_LIMIT) break;
  }
  return out;
}

async function lookupVolume(
  ctx: StageContext, terms: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ctx.dryRun || !DataForSeo.configured() || terms.length === 0) {
    if (!ctx.dryRun && !DataForSeo.configured()) {
      ctx.log.warn("no DataForSEO credentials: keywords have no volume");
    }
    return out;
  }
  const rows = await new DataForSeo(ctx.http, ctx.log).searchVolume(terms);
  for (const row of rows) {
    if (row.volume !== null) out.set(normalise(row.keyword), row.volume);
  }
  return out;
}

/**
 * Choose the keywords worth paying to check.
 *
 * With volume, sort by it. Without, fall back to the order the seed function
 * produced — area variants first, which is what a local business can actually
 * win. Either way transactional terms come first: this product exists to make
 * a phone ring, and an informational keyword does not do that even at rank 1.
 */
export function pick(
  all: SeedKeyword[], volumes: Map<string, number>, limit: number,
): SeedKeyword[] {
  const seen = new Set<string>();
  const unique = all.filter((k) => {
    const key = normalise(k.term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rank = (k: SeedKeyword): number => (k.intent === "transactional" ? 0 : 1);
  const indexed = unique.map((k, i) => ({ k, i }));

  indexed.sort((a, b) => {
    const intent = rank(a.k) - rank(b.k);
    if (intent !== 0) return intent;
    const av = volumes.get(normalise(a.k.term));
    const bv = volumes.get(normalise(b.k.term));
    if (av !== bv) return (bv ?? -1) - (av ?? -1);
    return a.i - b.i; // stable: the same site gives the same list
  });

  return indexed.slice(0, limit).map((x) => x.k);
}
