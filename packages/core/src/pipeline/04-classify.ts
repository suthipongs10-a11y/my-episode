/**
 * 04 — Classify.
 *
 * Rules first, and they settle the large majority for nothing. Only the pages
 * the rules could not place go to the cheap model, in **one** batched call
 * rather than one call per page — that difference is the whole cost of this
 * stage, and it is why the rules run first even though the model is better at
 * the job.
 *
 * The model is asked for a label from a closed list and nothing else. Its
 * schema has no confidence score and no numbers of any kind (project rule #1),
 * and a label outside the enum is dropped rather than coerced: an unrecognised
 * page stays `other`, which is what the rules already decided.
 */
import { z } from "zod";

import type { PipelineStage, StageContext } from "./runner.ts";
import { classifyExtracted } from "../crawl/classify.ts";
import { LlmRouter, loadPrompt } from "../llm/router.ts";
import { saveSnapshot } from "../db/queries.ts";
import { PageType } from "../types/index.ts";
import type { ExtractedPage } from "../crawl/extract.ts";
import type { CrawlResult } from "./03-crawl.ts";
import type { IntakeResult } from "./01-intake.ts";

export const LOW_CONFIDENCE = 0.6;
/** Cap on what one batch may cost. Beyond this the leftovers stay `other`. */
export const MAX_LLM_PAGES = 40;

const Classification = z.object({
  pages: z.array(z.object({ url: z.string(), type: PageType })).max(MAX_LLM_PAGES * 2),
});

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

    const relabelled = await askModel(ctx, crawl.pages, unsure);

    const counts = tally(crawl.pages.map((p) => p.pageType));
    ctx.state.set("classify", { counts, unsure, relabelled });
    await saveSnapshot(ctx.db, ctx.run.id, "site", "classify", {
      counts, unsure, relabelled,
    });
    ctx.log.info("classified", {
      ...counts, needs_review: unsure.length, relabelled_by_llm: relabelled,
    });
  },
};

/**
 * One batched call for everything the rules could not place.
 *
 * Returns how many pages the model actually changed. A page it declines to
 * place, names with a URL we did not send, or labels with something outside the
 * enum keeps whatever the rules decided — the model gets to improve the answer,
 * never to invent one.
 */
async function askModel(
  ctx: StageContext, pages: ExtractedPage[], unsure: string[],
): Promise<number> {
  const llm = new LlmRouter(ctx.http, ctx.log, ctx.dryRun);
  if (!llm.available() || unsure.length === 0) return 0;

  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const batch = unsure.slice(0, MAX_LLM_PAGES);
  if (unsure.length > batch.length) {
    ctx.log.warn("more unclassified pages than one batch allows", {
      total: unsure.length, sent: batch.length,
    });
  }

  const described = batch
    .map((url) => {
      const p = byUrl.get(url);
      if (!p) return null;
      return `- url: ${p.url}\n  title: ${p.title ?? "(ไม่มี)"}\n  h1: ${p.h1[0] ?? "(ไม่มี)"}\n  จำนวนคำ: ${p.wordCount}`;
    })
    .filter((s): s is string => s !== null)
    .join("\n");
  if (!described) return 0;

  const answer = await llm.ask({
    tier: "cheap",
    prompt: await loadPrompt("classify", {
      businessType: ctx.client.business_type ?? "ไม่ระบุ",
      areas: (ctx.client.areas ?? []).join(", ") || "ทั่วประเทศ",
      pages: described,
    }),
    schema: Classification,
  });
  if (!answer) return 0;

  const allowed = new Set(batch);
  let changed = 0;
  for (const row of answer.pages) {
    if (!allowed.has(row.url)) continue;      // not a page we asked about
    const page = byUrl.get(row.url);
    if (!page || page.pageType === row.type) continue;
    page.pageType = row.type;
    changed++;
    await ctx.db.query(
      `update pages set page_type = $3 where audit_run_id = $1 and url = $2`,
      [ctx.run.id, row.url, row.type],
    );
  }
  return changed;
}

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
