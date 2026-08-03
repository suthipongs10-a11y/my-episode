/**
 * 04 — Classify.
 *
 * Rules only, for now. Pages the rules cannot place come back as `other` with
 * low confidence and are counted here; M3 sends exactly those to the cheap LLM
 * in one batch. Classifying the easy 80% for free is the point.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { classifyExtracted } from "../crawl/classify.ts";
import { saveSnapshot } from "../db/queries.ts";
import type { CrawlResult } from "./03-crawl.ts";
import type { IntakeResult } from "./01-intake.ts";

export const LOW_CONFIDENCE = 0.6;

export const classifyStage: PipelineStage = {
  name: "04-classify",
  async run(ctx: StageContext) {
    const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
    if (!crawl || crawl.pages.length === 0) return;

    const intake = ctx.state.get("intake") as IntakeResult | undefined;
    const homeUrl = intake?.baseUrl;
    const areas = ctx.client.areas ?? [];
    const unsure: string[] = [];

    for (const page of crawl.pages) {
      const result = classifyExtracted(page, {
        isHomepage: homeUrl ? sameUrl(page.url, homeUrl) : false,
        areas,
      });
      page.pageType = result.type;
      if (result.confidence < LOW_CONFIDENCE) unsure.push(page.url);
      await ctx.db.query(
        `update pages set page_type = $3 where audit_run_id = $1 and url = $2`,
        [ctx.run.id, page.url, result.type],
      );
    }

    const counts = tally(crawl.pages.map((p) => p.pageType));
    ctx.state.set("classify", { counts, unsure });
    await saveSnapshot(ctx.db, ctx.run.id, "site", "classify", { counts, unsure });
    ctx.log.info("classified", { ...counts, needs_review: unsure.length });
  },
};

function tally(types: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of types) out[t] = (out[t] ?? 0) + 1;
  return out;
}

function sameUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.host === ub.host && ua.pathname.replace(/\/$/, "") === ub.pathname.replace(/\/$/, "");
  } catch {
    return a === b;
  }
}
