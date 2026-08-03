/**
 * 03 — Crawl.
 *
 * Fetch the pages and reduce each to the fields the rules need. Bounded on
 * purpose: 150 pages for the client, 50 per competitor. Past that the extra
 * pages change no finding, and the run has ten minutes in total.
 *
 * Plain HTTP, not a headless browser. Rendering every page would multiply the
 * time by an order of magnitude to change the answer on a minority of sites;
 * pages that come back empty are noted for the SPA fallback (M5) rather than
 * silently scored as having no content.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { extractPage, sameDomain, type ExtractedPage } from "../crawl/extract.ts";
import type { DiscoverResult } from "./02-discover.ts";
import type { IntakeResult } from "./01-intake.ts";

export const MAX_CLIENT_PAGES = 150;
export const MAX_DEPTH = 3;

export interface CrawlResult {
  pages: ExtractedPage[];
  brokenUrls: { url: string; status: number; linkedFrom: string[] }[];
  emptyPages: string[];
}

export const crawlStage: PipelineStage = {
  name: "03-crawl",
  async run(ctx: StageContext) {
    if (ctx.dryRun) {
      ctx.state.set("crawl", { pages: [], brokenUrls: [], emptyPages: [] } as CrawlResult);
      return;
    }
    const intake = ctx.state.get("intake") as IntakeResult | undefined;
    const discover = ctx.state.get("discover") as DiscoverResult | undefined;
    const base = intake?.baseUrl ?? `https://${ctx.client.domain}/`;

    const result = await crawlSite(ctx, base, discover?.seedUrls ?? [base]);
    ctx.state.set("crawl", result);

    for (const page of result.pages) {
      await saveSnapshot(ctx.db, ctx.run.id, "page", page.url, page);
      await savePage(ctx, page);
    }
    ctx.log.info("crawled", {
      pages: result.pages.length,
      broken: result.brokenUrls.length,
      empty: result.emptyPages.length,
    });
  },
};

async function crawlSite(
  ctx: StageContext, base: string, seeds: string[],
): Promise<CrawlResult> {
  const domain = ctx.client.domain;
  const queue: { url: string; depth: number; from: string | null }[] =
    [...new Set(seeds)].map((url) => ({ url, depth: 0, from: null }));
  const seen = new Set<string>();
  const pages: ExtractedPage[] = [];
  const broken = new Map<string, { status: number; linkedFrom: string[] }>();
  const emptyPages: string[] = [];

  while (queue.length > 0 && pages.length < MAX_CLIENT_PAGES) {
    const item = queue.shift()!;
    const url = normalise(item.url);
    if (seen.has(url) || !sameDomain(url, domain)) continue;
    seen.add(url);

    // The client asked for this audit, so their robots.txt does not gate us.
    const res = await ctx.http.get(url, { kind: "html", respectRobots: false });

    if (!res.ok) {
      const existing = broken.get(url);
      broken.set(url, {
        status: res.status,
        linkedFrom: [...(existing?.linkedFrom ?? []), ...(item.from ? [item.from] : [])],
      });
      continue;
    }

    const page = extractPage(res.finalUrl || url, res.body, {
      domain, statusCode: res.status,
    });
    pages.push(page);
    if (page.wordCount < 20) emptyPages.push(page.url);

    if (item.depth < MAX_DEPTH) {
      for (const next of page.internalUrls) {
        if (!seen.has(normalise(next))) {
          queue.push({ url: next, depth: item.depth + 1, from: page.url });
        }
      }
    }
  }

  return {
    pages,
    brokenUrls: [...broken.entries()].map(([url, b]) => ({ url, ...b })),
    emptyPages,
  };
}

async function savePage(ctx: StageContext, p: ExtractedPage): Promise<void> {
  await ctx.db.query(
    `insert into pages (audit_run_id, domain, is_competitor, url, status_code,
       page_type, title, title_len, meta_desc, meta_desc_len, h1, h1_count,
       word_count, internal_links, external_links, images_total, images_no_alt,
       schema_types, has_tel_link, has_line_link, has_form, form_field_count,
       has_price, has_review, lang)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             $19,$20,$21,$22,$23,$24,$25)`,
    [
      ctx.run.id, p.domain, p.isCompetitor, p.url, p.statusCode, p.pageType,
      p.title, p.titleLen, p.metaDesc, p.metaDescLen, p.h1, p.h1Count,
      p.wordCount, p.internalLinks, p.externalLinks, p.imagesTotal, p.imagesNoAlt,
      p.schemaTypes, p.hasTelLink, p.hasLineLink, p.hasForm, p.formFieldCount,
      p.hasPrice, p.hasReview, p.lang,
    ],
  );
}

/** Drop the fragment and any trailing slash so one page is not crawled twice. */
export function normalise(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return url;
  }
}
