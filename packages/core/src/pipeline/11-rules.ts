/**
 * 11 — Rules engine.
 *
 * Assembles the facts every earlier stage collected and runs the pure rules
 * over them. Nothing here fetches anything; if this stage needs data it does
 * not have, the fix belongs in the stage that should have collected it.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveFindings } from "../db/queries.ts";
import { runRules, type SiteFacts } from "../rules/index.ts";
import type { CrawlResult } from "./03-crawl.ts";
import type { DiscoverResult } from "./02-discover.ts";
import type { IntakeResult } from "./01-intake.ts";
import type { PsiResult } from "../rules/context.ts";

export const rulesStage: PipelineStage = {
  name: "11-rules",
  async run(ctx: StageContext) {
    const facts = buildFacts(ctx);
    const findings = runRules(facts);
    ctx.state.set("facts", facts);
    ctx.state.set("findings", findings);
    await saveFindings(ctx.db, ctx.run.id, findings);

    const bySeverity: Record<string, number> = {};
    for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    ctx.log.info("findings", { total: findings.length, ...bySeverity });
  },
};

export function buildFacts(ctx: StageContext): SiteFacts {
  const intake = ctx.state.get("intake") as IntakeResult | undefined;
  const discover = ctx.state.get("discover") as DiscoverResult | undefined;
  const crawl = ctx.state.get("crawl") as CrawlResult | undefined;
  const psi = (ctx.state.get("psi") as PsiResult[] | undefined) ?? [];

  return {
    domain: ctx.client.domain,
    pages: crawl?.pages ?? [],
    sitemapUrls: discover?.sitemapUrls ?? [],
    hasSitemap: discover?.hasSitemap ?? false,
    robotsDisallow: discover?.robotsDisallow ?? [],
    https: intake?.https ?? false,
    psi,
    brokenUrls: crawl?.brokenUrls ?? [],
    areas: ctx.client.areas ?? [],
  };
}
