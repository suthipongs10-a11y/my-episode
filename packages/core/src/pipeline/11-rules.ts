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
import type { KeywordsResult } from "./06-keywords.ts";
import type { SerpResult } from "./07-serp.ts";
import type { CompetitorsResult } from "./10-competitors.ts";
import type { KeywordFact, PsiResult } from "../rules/context.ts";
import { normalise } from "../keywords/seed.ts";

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
  const competitors = ctx.state.get("competitors") as CompetitorsResult | undefined;

  return {
    domain: ctx.client.domain,
    pages: crawl?.pages ?? [],
    competitorPages: competitors?.pages ?? [],
    sitemapUrls: discover?.sitemapUrls ?? [],
    hasSitemap: discover?.hasSitemap ?? false,
    robotsDisallow: discover?.robotsDisallow ?? [],
    https: intake?.https ?? false,
    psi,
    brokenUrls: crawl?.brokenUrls ?? [],
    areas: ctx.client.areas ?? [],
    areaScope: ctx.client.area_scope,
    keywords: joinKeywords(ctx),
    competitors: competitors?.profiles ?? [],
  };
}

/**
 * Stitch 06's keyword list to 07's positions.
 *
 * Kept out of both stages on purpose: 06 must work with no SERP data and 07
 * must work without re-deriving the keyword list, so the join belongs to
 * whoever needs them together — which is the rules engine.
 */
function joinKeywords(ctx: StageContext): KeywordFact[] {
  const kw = ctx.state.get("keywords") as KeywordsResult | undefined;
  const serp = ctx.state.get("serp") as SerpResult | undefined;
  if (!kw || kw.keywords.length === 0) return [];

  const positions = new Map((serp?.rankings ?? []).map((r) => [normalise(r.term), r]));

  return kw.keywords.map((k) => {
    const hit = positions.get(normalise(k.term));
    return {
      term: k.term,
      intent: k.intent,
      area: k.area,
      volume: k.volume,
      checked: hit !== undefined,
      position: hit?.position ?? null,
      ahead: hit?.ahead ?? [],
      paidDomains: hit?.paidDomains ?? [],
    };
  });
}
