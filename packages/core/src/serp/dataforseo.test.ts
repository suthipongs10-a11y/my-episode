/**
 * The DataForSEO client and the summary built on top of it. No network.
 *
 * A paid API that quietly changes shape is worse than one that fails outright,
 * because the failure shows up as a report telling a client they rank nowhere.
 * These tests pin the parsing, and pin what happens when the parsing fails.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CachedFetch } from "../http/cached-fetch.ts";
import { createLogger } from "../log/logger.ts";
import { resetEnv } from "../env.ts";
import { BATCH_SIZE, DataForSeo, chunk, splitItems } from "./dataforseo.ts";
import { isAggregator, summarise } from "../pipeline/07-serp.ts";

let cacheDir: string;
const log = createLogger({ level: "error" });

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "wgi-dfs-"));
  process.env.DFS_LOGIN = "user";
  process.env.DFS_PASSWORD = "pass";
  resetEnv();
});
afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
  delete process.env.DFS_LOGIN;
  delete process.env.DFS_PASSWORD;
  resetEnv();
});

function api(reply: unknown, status = 200) {
  const bodies: string[] = [];
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ""));
    return new Response(JSON.stringify(reply), {
      status, headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { impl, bodies, calls: () => bodies.length };
}

function client(fetchImpl: typeof fetch) {
  const http = new CachedFetch({
    cacheDir, fetchImpl, sleepImpl: async () => {}, perDomainDelayMs: 0,
  });
  return new DataForSeo(http, log);
}

const serpReply = (keyword: string, items: unknown[]) => ({
  status_code: 20000,
  tasks: [{ status_code: 20000, data: { keyword }, result: [{ keyword, items }] }],
});

describe("configuration", () => {
  it("is not configured without both halves of the credential", () => {
    delete process.env.DFS_PASSWORD;
    resetEnv();
    expect(DataForSeo.configured()).toBe(false);
  });
  it("is configured with both", () => {
    expect(DataForSeo.configured()).toBe(true);
  });
});

describe("searchVolume", () => {
  it("returns real volume per term", async () => {
    const a = api({
      status_code: 20000,
      tasks: [{ status_code: 20000, result: [
        { keyword: "รับล้างแอร์", search_volume: 1300 },
        { keyword: "ล้างแอร์ ภูเก็ต", search_volume: 480 },
      ] }],
    });
    const rows = await client(a.impl).searchVolume(["รับล้างแอร์", "ล้างแอร์ ภูเก็ต"]);
    expect(rows).toEqual([
      { keyword: "รับล้างแอร์", volume: 1300 },
      { keyword: "ล้างแอร์ ภูเก็ต", volume: 480 },
    ]);
    expect(a.calls()).toBe(1); // one request for the whole list
  });

  it("keeps 'no data' as null rather than turning it into zero", async () => {
    const a = api({
      status_code: 20000,
      tasks: [{ status_code: 20000, result: [{ keyword: "x", search_volume: null }] }],
    });
    expect(await client(a.impl).searchVolume(["x"])).toEqual([{ keyword: "x", volume: null }]);
  });

  it("calls nothing for an empty list", async () => {
    const a = api({});
    expect(await client(a.impl).searchVolume([])).toEqual([]);
    expect(a.calls()).toBe(0);
  });

  it("returns nothing when DataForSEO reports an error inside an HTTP 200", async () => {
    const a = api({ status_code: 40200, status_message: "payment required", tasks: [] });
    expect(await client(a.impl).searchVolume(["x"])).toEqual([]);
  });

  it("returns nothing on a transport failure, rather than throwing", async () => {
    const a = api({}, 502);
    expect(await client(a.impl).searchVolume(["x"])).toEqual([]);
  });
});

describe("serp", () => {
  it("sends one task per keyword and reads positions back", async () => {
    const a = api(serpReply("รับล้างแอร์", [
      { type: "organic", rank_absolute: 1, domain: "rival.com", url: "https://rival.com/a" },
      { type: "organic", rank_absolute: 4, domain: "mine.com", url: "https://mine.com/b" },
    ]));
    const rows = await client(a.impl).serp(["รับล้างแอร์"]);
    expect(rows[0]!.organic).toEqual([
      { position: 1, domain: "rival.com", url: "https://rival.com/a" },
      { position: 4, domain: "mine.com", url: "https://mine.com/b" },
    ]);
    expect(JSON.parse(a.bodies[0]!)).toHaveLength(1);
  });

  it("batches, so 30 keywords is a few requests and not thirty", async () => {
    const a = api(serpReply("k", []));
    await client(a.impl).serp(Array.from({ length: 30 }, (_, i) => `k${i}`));
    expect(a.calls()).toBe(Math.ceil(30 / BATCH_SIZE));
    expect(a.calls()).toBeLessThan(5);
  });

  it("drops a task that does not parse instead of inventing a position", async () => {
    const a = api({
      status_code: 20000,
      tasks: [
        { status_code: 20000, data: { keyword: "good" }, result: [{ items: [] }] },
        { unexpected: "shape" },
      ],
    });
    const rows = await client(a.impl).serp(["good", "bad"]);
    expect(rows.map((r) => r.keyword)).toEqual(["good"]);
  });
});

describe("splitItems", () => {
  it("separates advertisers from organic results", () => {
    const { organic, paidDomains } = splitItems([
      { type: "paid", rank_absolute: 1, domain: "ads.com" },
      { type: "organic", rank_absolute: 1, domain: "a.com", url: "https://a.com/" },
    ]);
    expect(paidDomains).toEqual(["ads.com"]);
    expect(organic.map((o) => o.domain)).toEqual(["a.com"]);
  });

  it("counts a domain once — two results are still one competitor", () => {
    const { organic } = splitItems([
      { type: "organic", rank_absolute: 3, domain: "a.com", url: "https://a.com/x" },
      { type: "organic", rank_absolute: 7, domain: "a.com", url: "https://a.com/y" },
    ]);
    expect(organic).toHaveLength(1);
    expect(organic[0]!.position).toBe(3);
  });

  it("ignores map packs, videos and the other item types", () => {
    const { organic } = splitItems([
      { type: "local_pack", rank_absolute: 1, domain: "a.com" },
      { type: "video", rank_absolute: 2, domain: "youtube.com" },
    ]);
    expect(organic).toEqual([]);
  });

  it("treats www and bare domains as the same site", () => {
    const { organic } = splitItems([
      { type: "organic", rank_absolute: 1, domain: "www.a.com", url: "https://www.a.com/" },
      { type: "organic", rank_absolute: 2, domain: "a.com", url: "https://a.com/x" },
    ]);
    expect(organic).toHaveLength(1);
  });
});

describe("summarise", () => {
  const row = (keyword: string, domains: [string, number][], paid: string[] = []) => ({
    keyword,
    organic: domains.map(([domain, position]) => ({ domain, position, url: `https://${domain}/` })),
    paidDomains: paid,
  });

  it("finds our own position and who is above us", () => {
    const s = summarise([row("k", [["rival.com", 1], ["mine.com", 5]])], "mine.com");
    expect(s.rankings[0]!.position).toBe(5);
    expect(s.rankings[0]!.ahead).toEqual([{ domain: "rival.com", position: 1 }]);
  });

  it("reports null, not zero, when we do not appear at all", () => {
    const s = summarise([row("k", [["rival.com", 1]])], "mine.com");
    expect(s.rankings[0]!.position).toBeNull();
  });

  it("does not list domains below us as 'ahead'", () => {
    const s = summarise([row("k", [["mine.com", 2], ["rival.com", 8]])], "mine.com");
    expect(s.rankings[0]!.ahead).toEqual([]);
  });

  it("needs a domain to appear more than once before calling it a competitor", () => {
    const s = summarise(
      [row("a", [["once.com", 3]]), row("b", [["twice.com", 2]]), row("c", [["twice.com", 4]])],
      "mine.com",
    );
    expect(s.competitors.map((c) => c.domain)).toEqual(["twice.com"]);
  });

  it("keeps Facebook and Pantip out of the competitor list", () => {
    const s = summarise(
      [row("a", [["facebook.com", 1], ["real.com", 2]]),
       row("b", [["facebook.com", 1], ["real.com", 3]])],
      "mine.com",
    );
    expect(s.competitors.map((c) => c.domain)).toEqual(["real.com"]);
  });

  it("ignores a domain that only ever appears deep in the results", () => {
    const s = summarise(
      [row("a", [["deep.com", 55]]), row("b", [["deep.com", 71]])],
      "mine.com",
    );
    expect(s.competitors).toEqual([]);
  });

  it("never lists us as our own competitor", () => {
    const s = summarise(
      [row("a", [["mine.com", 1]]), row("b", [["www.mine.com", 2]])],
      "mine.com",
    );
    expect(s.competitors).toEqual([]);
  });

  it("orders competitors by how often they beat us", () => {
    const s = summarise(
      [row("a", [["often.com", 1], ["rare.com", 2]]),
       row("b", [["often.com", 1], ["rare.com", 3]]),
       row("c", [["often.com", 2]])],
      "mine.com",
    );
    expect(s.competitors[0]!.domain).toBe("often.com");
    expect(s.competitors[0]!.appearances).toBe(3);
  });
});

describe("isAggregator", () => {
  it("catches subdomains of the big platforms", () => {
    expect(isAggregator("m.facebook.com")).toBe(true);
    expect(isAggregator("www.pantip.com")).toBe(true);
  });
  it("leaves a real local business alone", () => {
    expect(isAggregator("phuketcleaning.co.th")).toBe(false);
  });
});

describe("chunk", () => {
  it("splits evenly and keeps the remainder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns nothing for an empty list", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
