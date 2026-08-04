/**
 * 02 — Discover.
 *
 * Work out which URLs exist before fetching any of them. A sitemap is both
 * cheaper and more complete than crawling, so it is tried first; crawling from
 * the homepage is the fallback for sites that have none.
 *
 * robots.txt is read here for a second reason beyond politeness: TEC-005 needs
 * to know whether the site is blocking its own service pages.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { parseRobots } from "../http/cached-fetch.ts";
import type { IntakeResult } from "./01-intake.ts";

export interface DiscoverResult {
  sitemapUrls: string[];
  hasSitemap: boolean;
  robotsDisallow: string[];
  seedUrls: string[];
}

const MAX_SITEMAP_URLS = 500;

export const discoverStage: PipelineStage = {
  name: "02-discover",
  async run(ctx: StageContext) {
    const intake = ctx.state.get("intake") as IntakeResult | undefined;
    const base = intake?.baseUrl ?? `https://${ctx.client.domain}/`;

    const result: DiscoverResult = ctx.dryRun
      ? { sitemapUrls: [], hasSitemap: false, robotsDisallow: [], seedUrls: [base] }
      : await discover(ctx, base);

    ctx.state.set("discover", result);
    await saveSnapshot(ctx.db, ctx.run.id, "site", "discover", result);
    ctx.log.info("discovered urls", {
      sitemap: result.sitemapUrls.length,
      hasSitemap: result.hasSitemap,
      disallow: result.robotsDisallow.length,
    });
  },
};

async function discover(ctx: StageContext, base: string): Promise<DiscoverResult> {
  const robotsDisallow = await readRobots(ctx, base);
  const sitemapUrls = await readSitemaps(ctx, base, robotsSitemaps(ctx));
  return {
    sitemapUrls,
    hasSitemap: sitemapUrls.length > 0,
    robotsDisallow,
    seedUrls: sitemapUrls.length > 0 ? [base, ...sitemapUrls] : [base],
  };
}

async function readRobots(ctx: StageContext, base: string): Promise<string[]> {
  const res = await ctx.http.get(new URL("/robots.txt", base).toString(), {
    kind: "robots", respectRobots: false,
  });
  if (!res.ok || !res.body.trim()) return [];
  ctx.state.set("robotsText", res.body);
  return parseRobots(res.body, "*").disallow;
}

function robotsSitemaps(ctx: StageContext): string[] {
  const text = (ctx.state.get("robotsText") as string | undefined) ?? "";
  return [...text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]!).filter(Boolean);
}

/** Follow sitemap.xml, plus any listed in robots.txt, one index level deep. */
async function readSitemaps(
  ctx: StageContext, base: string, extra: string[],
): Promise<string[]> {
  const candidates = [...new Set([new URL("/sitemap.xml", base).toString(), ...extra])];
  const out: string[] = [];

  for (const url of candidates) {
    if (out.length >= MAX_SITEMAP_URLS) break;
    const res = await ctx.http.get(url, { kind: "sitemap", respectRobots: false });
    if (!res.ok) continue;
    const locs = locsIn(res.body);

    // A sitemap index points at more sitemaps rather than pages.
    const nested = locs.filter((l) => l.toLowerCase().endsWith(".xml"));
    const pages = locs.filter((l) => !l.toLowerCase().endsWith(".xml"));
    out.push(...pages);

    for (const child of nested.slice(0, 5)) {
      if (out.length >= MAX_SITEMAP_URLS) break;
      const childRes = await ctx.http.get(child, { kind: "sitemap", respectRobots: false });
      if (childRes.ok) out.push(...locsIn(childRes.body).filter((l) => !l.endsWith(".xml")));
    }
  }
  return [...new Set(out)].slice(0, MAX_SITEMAP_URLS);
}

export function locsIn(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!).filter(Boolean);
}
