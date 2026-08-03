/**
 * 05 — PageSpeed Insights.
 *
 * Mobile only, three pages: home, the main service page, and contact. The API
 * is free but slow (tens of seconds per call), so it is the run's time budget
 * that limits it, not money. Three pages is enough to tell whether the site is
 * slow; measuring 150 would tell us the same thing an hour later.
 */
import { z } from "zod";
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { env } from "../env.ts";
import type { PsiResult } from "../rules/context.ts";
import type { CrawlResult } from "./03-crawl.ts";

const PsiResponse = z.object({
  lighthouseResult: z.object({
    categories: z.object({
      performance: z.object({ score: z.number().nullable() }).optional(),
    }),
    audits: z.record(z.object({ numericValue: z.number().optional() }).passthrough()),
  }),
});

export const psiStage: PipelineStage = {
  name: "05-psi",
  async run(ctx: StageContext) {
    const key = env().PSI_API_KEY;
    if (ctx.dryRun || !key) {
      ctx.log.warn(key ? "dry run: skipping PSI" : "no PSI_API_KEY: skipping PageSpeed");
      ctx.state.set("psi", [] as PsiResult[]);
      return;
    }

    const targets = pickTargets(ctx);
    const results: PsiResult[] = [];

    for (const url of targets) {
      const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      api.searchParams.set("url", url);
      api.searchParams.set("strategy", "mobile");
      api.searchParams.set("key", key);

      const res = await ctx.http.get(api.toString(), {
        kind: "psi", respectRobots: false, provider: "pagespeed",
        timeoutMs: 60_000, costThb: 0,
      });
      if (!res.ok) {
        ctx.log.warn("PSI failed", { url, status: res.status });
        continue;
      }
      const parsed = parse(res.body);
      if (!parsed) {
        ctx.log.warn("PSI returned an unexpected shape", { url });
        continue;
      }
      results.push({ url, ...parsed });
    }

    ctx.state.set("psi", results);
    await saveSnapshot(ctx.db, ctx.run.id, "psi", ctx.client.domain, results);
    ctx.log.info("measured", { pages: results.length });
  },
};

function parse(body: string): Omit<PsiResult, "url"> | null {
  try {
    const json = PsiResponse.parse(JSON.parse(body));
    const audits = json.lighthouseResult.audits;
    const perf = json.lighthouseResult.categories.performance?.score ?? null;
    return {
      performanceScore: perf === null ? null : Math.round(perf * 100),
      lcpSeconds: ms(audits["largest-contentful-paint"]?.numericValue) ,
      clsScore: audits["cumulative-layout-shift"]?.numericValue ?? null,
      inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
    };
  } catch {
    return null;
  }
}

function ms(value: number | undefined): number | null {
  return value === undefined ? null : Math.round((value / 1000) * 100) / 100;
}

/** Home, the biggest service page, and contact — the three that matter. */
export function pickTargets(ctx: StageContext): string[] {
  const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
  const pages = crawl?.pages ?? [];
  const pick = (type: string) => pages.filter((p) => p.pageType === type);

  const home = pick("home")[0]?.url;
  const service = [...pick("service"), ...pick("location")]
    .sort((a, b) => b.wordCount - a.wordCount)[0]?.url;
  const contact = pick("contact")[0]?.url;

  return [...new Set([home, service, contact].filter((u): u is string => Boolean(u)))];
}
