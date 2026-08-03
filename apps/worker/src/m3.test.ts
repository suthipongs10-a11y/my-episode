/**
 * M3 end to end: keywords, rankings, competitors, and the findings built on
 * them — with no internet and no money.
 *
 * Three local servers stand in for the outside world: the client's site, a
 * competitor's site, and one process serving both DataForSEO and an
 * OpenAI-compatible LLM. Everything the pipeline reaches is something this file
 * started, so the run is deterministic and free, and yet every stage really
 * runs, really parses a response, and really writes rows.
 *
 * This is M3's acceptance criterion in executable form. The parts that cannot
 * be proven here — that DataForSEO's real responses match these shapes, and
 * that positions agree with a manual check — are listed in STATUS.md as owed
 * once credentials exist. A fake API proves the pipeline, not the vendor.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "@core/db/client.ts";
import { resetEnv } from "@core/env.ts";
import { getFindings } from "@core/db/queries.ts";
import { main } from "./cli.ts";

const FIXTURES = fileURLToPath(new URL("../../../fixtures/", import.meta.url));
const read = (p: string) => readFileSync(join(FIXTURES, p), "utf8");

let dir: string;
let clientSite: Server;
let rivalSite: Server;
let apis: Server;
let clientOrigin: string;
let rivalOrigin: string;

/** Requests the fake APIs received, so the test can assert on batching. */
let apiHits: string[] = [];

function serve(routes: Record<string, { body: string; type: string }>): Server {
  return createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const route = routes[path] ?? routes[path.replace(/\/$/, "") + "/"];
    if (!route) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": route.type });
    res.end(route.body);
  });
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  return `127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
}

beforeAll(async () => {
  clientSite = serve({
    "/": { body: read("phuketmaid/index.html"), type: "text/html" },
    "/services/deep-cleaning/": {
      body: read("phuketmaid/services-deep-cleaning.html"), type: "text/html",
    },
    "/contact/": { body: read("phuketmaid/contact.html"), type: "text/html" },
    "/robots.txt": { body: read("phuketmaid/robots.txt"), type: "text/plain" },
  });
  rivalSite = serve({
    "/": { body: read("goodsite/index.html"), type: "text/html" },
    "/robots.txt": { body: "User-agent: *\nAllow: /\n", type: "text/plain" },
  });

  clientOrigin = await listen(clientSite);
  rivalOrigin = await listen(rivalSite);

  // One process answering as both DataForSEO and an OpenAI-compatible model.
  apis = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    apiHits.push(path);
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(answer(path, body)));
    });
  });
  const apiOrigin = await listen(apis);

  process.env.DFS_LOGIN = "test";
  process.env.DFS_PASSWORD = "test";
  process.env.DFS_BASE_URL = `http://${apiOrigin}/v3`;
  process.env.LLM_BASE_URL = `http://${apiOrigin}/v1`;
  process.env.LLM_API_KEY = "test";
  process.env.LLM_MODEL_CHEAP = "fake-cheap";
  process.env.LLM_MODEL_SMART = "fake-smart";
});

afterAll(async () => {
  for (const s of [clientSite, rivalSite, apis]) {
    await new Promise<void>((r) => s.close(() => r()));
  }
  for (const k of [
    "DFS_LOGIN", "DFS_PASSWORD", "DFS_BASE_URL",
    "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL_CHEAP", "LLM_MODEL_SMART",
  ]) delete process.env[k];
  resetEnv();
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "wgi-m3-"));
  apiHits = [];
  process.env.PGLITE_DIR = join(dir, "db");
  process.env.CACHE_DIR = join(dir, "cache");
  process.env.HTTP_DELAY_MS = "0";
  delete process.env.DATABASE_URL;
  resetEnv();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const openDb = (): Promise<Db> => createDb({ dataDir: join(dir, "db") });

/**
 * The fake vendors.
 *
 * The LLM deliberately misbehaves: it returns a `volume` and a `confidence`
 * alongside every keyword. Nothing downstream may ever show them.
 */
function answer(path: string, body: string): unknown {
  if (path.endsWith("/chat/completions")) {
    const content = body.includes("จัดหมวดหน้าเว็บ")
      ? JSON.stringify({ pages: [] })
      : JSON.stringify({
          keywords: [
            { term: "แม่บ้านรายวัน ภูเก็ต", intent: "transactional", volume: 999_999 },
            { term: "วิธีทำความสะอาดโซฟา", intent: "informational", volume: 888_888 },
          ],
          confidence: 0.99,
        });
    return {
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 500, completion_tokens: 200 },
    };
  }

  if (path.includes("search_volume")) {
    const terms = (JSON.parse(body) as { keywords: string[] }[])[0]?.keywords ?? [];
    return {
      status_code: 20000,
      tasks: [{
        status_code: 20000,
        result: terms.map((keyword, i) => ({ keyword, search_volume: 100 * (i + 1) })),
      }],
    };
  }

  if (path.includes("/serp/")) {
    const tasks = JSON.parse(body) as { keyword: string }[];
    return {
      status_code: 20000,
      tasks: tasks.map(({ keyword }) => ({
        status_code: 20000,
        data: { keyword },
        result: [{
          keyword,
          items: [
            // The rival wins everything; the client appears nowhere. That is
            // what CMP-001 is for, and it needs the same domain every time.
            { type: "organic", rank_absolute: 1, domain: rivalOrigin, url: `http://${rivalOrigin}/` },
            { type: "organic", rank_absolute: 2, domain: "facebook.com", url: "https://facebook.com/x" },
            { type: "paid", rank_absolute: 1, domain: "advertiser.test", url: "https://advertiser.test/" },
          ],
        }],
      })),
    };
  }
  return {};
}

// ---------------------------------------------------------------------------
describe("M3, end to end", () => {
  it("builds keywords, checks rankings, crawls the rival and reports on it", async () => {
    expect(await main([`--domain=${clientOrigin}`, "--area=ภูเก็ต"])).toBe(0);
    const db = await openDb();
    const run = await db.one<{ id: string; status: string; stage: string }>(
      `select * from audit_runs`,
    );
    expect(run?.status).toBe("done");
    expect(run?.stage).toBe("12-scoring");

    // -- 06: keywords exist, and carry volume from the API, not the model ----
    const keywords = await db.query<{ term: string; volume: number | null; intent: string }>(
      `select term, volume, intent from keywords order by volume desc nulls last`,
    );
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.length).toBeLessThanOrEqual(30);
    expect(keywords.some((k) => k.volume !== null)).toBe(true);

    // The model asked for 999999. Rule #1 says it cannot have it.
    for (const k of keywords) {
      expect(k.volume === null || k.volume < 10_000, `${k.term} = ${k.volume}`).toBe(true);
    }
    // ...and its suggestion did make it in, as a term.
    expect(keywords.map((k) => k.term)).toContain("แม่บ้านรายวัน ภูเก็ต");

    // -- 07: rankings stored, competitor discovered -------------------------
    const rankings = await db.query<{ position: number | null }>(
      `select position from rankings`,
    );
    expect(rankings.length).toBeGreaterThan(0);
    expect(rankings.every((r) => r.position === null)).toBe(true); // we rank nowhere

    const competitors = await db.query<{ domain: string; source: string }>(
      `select domain, source from competitors`,
    );
    expect(competitors.map((c) => c.domain)).toEqual([rivalOrigin]);
    expect(competitors[0]!.source).toBe("serp");
    expect(competitors.map((c) => c.domain)).not.toContain("facebook.com");

    // -- 10: the rival was really crawled -----------------------------------
    const rivalPages = await db.query<{ url: string }>(
      `select url from pages where is_competitor = true`,
    );
    expect(rivalPages.length).toBeGreaterThan(0);

    // -- 11: M3 findings, and they name the rival ---------------------------
    const findings = await getFindings(db, run!.id);
    const codes = findings.map((f) => f.code);
    expect(codes).toContain("CON-004");  // the fixture has no FAQ anywhere
    expect(codes).toContain("CMP-001");  // the rival outranks us everywhere
    expect(codes).toContain("CMP-003");  // somebody is bidding on our terms

    // And the ones that correctly stay quiet on this fixture:
    // its service page is titled "...ภูเก็ต" and classifies as `location`, so
    // the site does have area coverage; and one rival is not a market.
    expect(codes).not.toContain("CON-002");
    expect(codes).not.toContain("CMP-002");

    const cmp001 = findings.find((f) => f.code === "CMP-001")!;
    expect(cmp001.evidence.competitor).toBe(rivalOrigin);
    expect(Number(cmp001.evidence.keywords_lost)).toBeGreaterThanOrEqual(5);

    // -- 12: visibility was measured, so it is scored rather than assumed ---
    const snap = await db.one<{ data: Record<string, never> }>(
      `select data from snapshots where kind = 'site' and target = 'scores'`,
    );
    const data = (typeof snap!.data === "string"
      ? JSON.parse(snap!.data as never)
      : snap!.data) as { scores: { visibility: number }; inputs: { keywords_checked: number } };
    expect(data.inputs.keywords_checked).toBeGreaterThan(0);
    expect(data.scores.visibility).toBe(0); // checked, and ranking for nothing

    // -- cost: real, bounded, and inside the budget -------------------------
    const cost = await db.one<{ cost_thb: string }>(`select cost_thb from audit_runs`);
    expect(Number(cost?.cost_thb)).toBeGreaterThan(0);
    expect(Number(cost?.cost_thb)).toBeLessThan(15);

    const llmCalls = await db.query<{ model: string; tokens_in: number; prompt_hash: string }>(
      `select model, tokens_in, prompt_hash from api_calls where provider = 'llm'`,
    );
    expect(llmCalls.length).toBeGreaterThan(0);
    expect(llmCalls[0]!.model).toBe("fake-cheap");
    expect(llmCalls[0]!.tokens_in).toBe(500);
    expect(llmCalls[0]!.prompt_hash).toMatch(/^[0-9a-f]{16}$/);

    await db.close();
  });

  it("checks 30 keywords in a handful of requests, not thirty", async () => {
    await main([`--domain=${clientOrigin}`, "--area=ภูเก็ต"]);
    const serpCalls = apiHits.filter((p) => p.includes("/serp/"));
    expect(serpCalls.length).toBeGreaterThan(0);
    expect(serpCalls.length).toBeLessThanOrEqual(4);
  });

  it("spends nothing and calls no vendor in a dry run", async () => {
    expect(await main([`--domain=${clientOrigin}`, "--area=ภูเก็ต", "--dry-run"])).toBe(0);
    expect(apiHits).toEqual([]);

    const db = await openDb();
    const dryCost = await db.one<{ cost_thb: string }>(`select cost_thb from audit_runs`);
    expect(Number(dryCost?.cost_thb)).toBe(0);
    expect(await db.query(`select id from keywords`)).toHaveLength(0);
    await db.close();
  });

  it("still produces an audit when both vendors are unconfigured", async () => {
    const saved = { ...process.env };
    delete process.env.DFS_LOGIN;
    delete process.env.DFS_PASSWORD;
    delete process.env.LLM_BASE_URL;
    resetEnv();

    try {
      expect(await main([`--domain=${clientOrigin}`, "--area=ภูเก็ต"])).toBe(0);
      const db = await openDb();

      // Keywords still exist — they came from the site itself.
      const keywords = await db.query<{ term: string; volume: number | null }>(
        `select term, volume from keywords`,
      );
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.every((k) => k.volume === null)).toBe(true);

      // No rankings, no competitors, and no competitor findings invented.
      expect(await db.query(`select id from rankings`)).toHaveLength(0);
      const run = await db.one<{ id: string }>(`select id from audit_runs`);
      const codes = (await getFindings(db, run!.id)).map((f) => f.code);
      expect(codes).not.toContain("CMP-001");
      expect(codes).not.toContain("CMP-002");
      expect(codes).not.toContain("CON-001");
      expect(codes).not.toContain("CON-003");
      expect(codes).toContain("CON-004"); // this one needs no vendor at all

      // Visibility is unknown, not zero — the whole reason scoring v2 exists.
      const snap = await db.one<{ data: Record<string, never> }>(
        `select data from snapshots where kind = 'site' and target = 'scores'`,
      );
      const data = (typeof snap!.data === "string"
        ? JSON.parse(snap!.data as never)
        : snap!.data) as { scores: { visibility: number } };
      expect(data.scores.visibility).toBe(50);

      const bareCost = await db.one<{ cost_thb: string }>(`select cost_thb from audit_runs`);
      expect(Number(bareCost?.cost_thb)).toBe(0);
      await db.close();
    } finally {
      Object.assign(process.env, saved);
      resetEnv();
    }
  });
});
