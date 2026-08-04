/**
 * DataForSEO — search volume and SERP positions.
 *
 * ## Why batched, and why it matters
 *
 * `docs/pipeline.md` names the real constraint: 30 keywords fetched one at a
 * time is roughly 300 seconds, half the audit's entire ten-minute budget, for
 * a stage that is not the point of the product. DataForSEO's live endpoints
 * accept an *array* of tasks in one POST, so 30 keywords is a handful of
 * requests rather than thirty. Billing is per task either way — this buys time,
 * not money.
 *
 * ## Everything is validated
 *
 * A paid API that changes shape silently is worse than one that fails, because
 * the failure surfaces as a report full of "not ranking" for a site that ranks
 * fine. Every response goes through zod, and a task that does not parse is
 * dropped with a warning rather than coerced into a zero.
 */
import { z } from "zod";

import type { CachedFetch } from "../http/cached-fetch.ts";
import type { Logger } from "../log/logger.ts";
import { thb } from "../cost/pricing.ts";
import { env } from "../env.ts";

/** Thailand. DataForSEO's own location code, not a coordinate. */
export const LOCATION_TH = 2764;
export const LANGUAGE_TH = "th";

/** Tasks per POST. Well under their 100 limit — a failed batch costs less. */
export const BATCH_SIZE = 10;

export interface SerpRow {
  keyword: string;
  /** Organic results in order, deduped to one entry per domain. */
  organic: { position: number; domain: string; url: string }[];
  /** Domains running ads on this term, for CMP-003. */
  paidDomains: string[];
}

export interface VolumeRow {
  keyword: string;
  /** Monthly searches. Null means DataForSEO had no data, not zero searches. */
  volume: number | null;
}

// ---------------------------------------------------------------------------
// Response shapes — only the fields we use.
// ---------------------------------------------------------------------------
const Envelope = z.object({
  status_code: z.number(),
  status_message: z.string().optional(),
  tasks: z.array(z.unknown()).nullable().optional(),
});

const VolumeTask = z.object({
  status_code: z.number(),
  result: z
    .array(z.object({
      keyword: z.string(),
      search_volume: z.number().nullable().optional(),
    }))
    .nullable()
    .optional(),
});

const SerpTask = z.object({
  status_code: z.number(),
  data: z.object({ keyword: z.string() }).optional(),
  result: z
    .array(z.object({
      keyword: z.string().optional(),
      items: z
        .array(z.object({
          type: z.string(),
          rank_absolute: z.number().nullable().optional(),
          domain: z.string().nullable().optional(),
          url: z.string().nullable().optional(),
        }))
        .nullable()
        .optional(),
    }))
    .nullable()
    .optional(),
});

export class DataForSeo {
  constructor(
    private readonly http: CachedFetch,
    private readonly log: Logger,
  ) {}

  static configured(): boolean {
    const e = env();
    return Boolean(e.DFS_LOGIN && e.DFS_PASSWORD);
  }

  /**
   * Monthly search volume. One request covers the whole list.
   *
   * Terms DataForSEO does not know come back as null rather than 0, because
   * "we have no data" and "nobody searches this" lead to opposite decisions
   * about whether to write a page.
   */
  async searchVolume(terms: string[], locationCode = LOCATION_TH): Promise<VolumeRow[]> {
    if (terms.length === 0) return [];
    const body = JSON.stringify([{
      keywords: terms.slice(0, 1000),
      location_code: locationCode,
      language_code: LANGUAGE_TH,
    }]);

    const tasks = await this.post("/keywords_data/google_ads/search_volume/live", body, {
      endpointKind: "serp",
      costThb: thb("dfsVolumeLive"),
      units: 1,
    });
    if (!tasks) return [];

    const out: VolumeRow[] = [];
    for (const raw of tasks) {
      const task = VolumeTask.safeParse(raw);
      if (!task.success || !task.data.result) continue;
      for (const row of task.data.result) {
        out.push({ keyword: row.keyword, volume: row.search_volume ?? null });
      }
    }
    return out;
  }

  /**
   * Positions for many keywords. Batches run concurrently; the per-domain
   * throttle in cached-fetch keeps that polite on DataForSEO's side.
   */
  async serp(terms: string[], locationCode = LOCATION_TH): Promise<SerpRow[]> {
    if (terms.length === 0) return [];
    const batches = chunk(terms, BATCH_SIZE);
    const results = await Promise.all(batches.map((b) => this.serpBatch(b, locationCode)));
    return results.flat();
  }

  private async serpBatch(terms: string[], locationCode: number): Promise<SerpRow[]> {
    const body = JSON.stringify(
      terms.map((keyword) => ({
        keyword,
        location_code: locationCode,
        language_code: LANGUAGE_TH,
        device: "mobile",       // the audience is on a phone; so is the ranking
        depth: 100,
      })),
    );

    const tasks = await this.post("/serp/google/organic/live/advanced", body, {
      endpointKind: "serp",
      costThb: thb("dfsSerpLive", terms.length),
      units: terms.length,
    });
    if (!tasks) return [];

    const out: SerpRow[] = [];
    for (const raw of tasks) {
      const task = SerpTask.safeParse(raw);
      if (!task.success) {
        this.log.warn("serp task did not parse; dropped");
        continue;
      }
      const keyword = task.data.data?.keyword ?? task.data.result?.[0]?.keyword;
      if (!keyword) continue;
      out.push({ keyword, ...splitItems(task.data.result?.[0]?.items ?? []) });
    }
    return out;
  }

  /** One POST, authenticated, costed, and unwrapped to the task array. */
  private async post(
    path: string,
    body: string,
    opts: { endpointKind: "serp"; costThb: number; units: number },
  ): Promise<unknown[] | null> {
    const e = env();
    const auth = Buffer.from(`${e.DFS_LOGIN}:${e.DFS_PASSWORD}`).toString("base64");

    const res = await this.http.get(e.DFS_BASE_URL.replace(/\/+$/, "") + path, {
      kind: opts.endpointKind,
      method: "POST",
      respectRobots: false,
      provider: "dataforseo",
      timeoutMs: 120_000,
      costThb: opts.costThb,
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body,
      onCost: () => ({ units: opts.units }),
    });

    if (!res.ok) {
      this.log.warn("dataforseo call failed", { path, status: res.status, error: res.error });
      return null;
    }

    let envelope: z.infer<typeof Envelope>;
    try {
      envelope = Envelope.parse(JSON.parse(res.body));
    } catch {
      this.log.warn("dataforseo returned an unexpected envelope", { path });
      return null;
    }
    // 20000 is their "ok"; anything else is an error even with HTTP 200.
    if (envelope.status_code !== 20000) {
      this.log.warn("dataforseo reported an error", {
        path, code: envelope.status_code, message: envelope.status_message,
      });
      return null;
    }
    return envelope.tasks ?? [];
  }
}

/**
 * Split a SERP into organic positions and advertisers.
 *
 * Organic results are deduped to the first appearance of each domain: a site
 * holding positions 3 and 7 ranks 3rd, and counting it twice would make
 * "how many keywords does the competitor beat us on" wrong.
 */
export function splitItems(
  items: { type: string; rank_absolute?: number | null; domain?: string | null; url?: string | null }[],
): { organic: SerpRow["organic"]; paidDomains: string[] } {
  const organic: SerpRow["organic"] = [];
  const seen = new Set<string>();
  const paid = new Set<string>();

  for (const item of items) {
    const domain = (item.domain ?? "").toLowerCase().replace(/^www\./, "");
    if (!domain) continue;

    if (item.type === "paid") {
      paid.add(domain);
      continue;
    }
    if (item.type !== "organic") continue;
    if (seen.has(domain)) continue;
    seen.add(domain);
    organic.push({
      position: item.rank_absolute ?? organic.length + 1,
      domain,
      url: item.url ?? "",
    });
  }

  organic.sort((a, b) => a.position - b.position);
  return { organic, paidDomains: [...paid] };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
