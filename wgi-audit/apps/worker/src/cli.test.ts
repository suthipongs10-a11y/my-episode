/**
 * The CLI, end to end.
 *
 * Two kinds of test here:
 *
 *  - **plumbing** (`--dry-run`): client and run rows, argument handling, the
 *    queue and the worker. No stage reaches outside.
 *  - **the whole pipeline**, against a local server serving the fixtures. Still
 *    no internet, still free, still deterministic — but every stage from intake
 *    to scoring really runs, which is M1's acceptance criterion.
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
import { createLogger } from "@core/log/logger.ts";
import { getFindings } from "@core/db/queries.ts";
import { CURRENT_SCORING_VERSION } from "@core/scoring/index.ts";
import { main, normaliseDomain, parseArgs } from "./cli.ts";
import { tick } from "./index.ts";

const FIXTURES = fileURLToPath(new URL("../../../fixtures/", import.meta.url));
const read = (p: string) => readFileSync(join(FIXTURES, p), "utf8");

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "wgi-cli-"));
  process.env.PGLITE_DIR = join(dir, "db");
  process.env.CACHE_DIR = join(dir, "cache");
  delete process.env.DATABASE_URL;
  delete process.env.PSI_API_KEY;
  // The fixture server is ours and is on loopback; the one-second courtesy
  // delay would only slow the suite down.
  process.env.HTTP_DELAY_MS = "0";
  resetEnv();
});

afterEach(async () => {
  delete process.env.PGLITE_DIR;
  delete process.env.CACHE_DIR;
  delete process.env.HTTP_DELAY_MS;
  resetEnv();
  await rm(dir, { recursive: true, force: true });
});

const openDb = (): Promise<Db> => createDb({ dataDir: join(dir, "db") });

// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  it("reads domain, areas and flags", () => {
    const a = parseArgs(["--domain=https://www.Example.com/path", "--area=ภูเก็ต,ป่าตอง", "--dry-run"]);
    expect(a.domain).toBe("example.com");
    expect(a.areas).toEqual(["ภูเก็ต", "ป่าตอง"]);
    expect(a.dryRun).toBe(true);
  });

  it("keeps only real stage names in --only", () => {
    expect(parseArgs(["--only=03-crawl,nonsense,05-psi"]).only).toEqual(["03-crawl", "05-psi"]);
  });
});

describe("normaliseDomain", () => {
  it("strips scheme, www, path and case", () => {
    expect(normaliseDomain("HTTPS://WWW.Example.com/a/b?c=1")).toBe("example.com");
    expect(normaliseDomain("example.co.th")).toBe("example.co.th");
  });
});

// ---------------------------------------------------------------------------
describe("plumbing", () => {
  it("creates a client and an audit_run that reaches done", async () => {
    expect(await main(["--domain=phuketmaidservice.com", "--area=ภูเก็ต", "--dry-run"])).toBe(0);

    const db = await openDb();
    const client = await db.one<{ domain: string; areas: string[] }>(`select * from clients`);
    expect(client?.domain).toBe("phuketmaidservice.com");
    expect(client?.areas).toEqual(["ภูเก็ต"]);

    const run = await db.one<{ status: string; cost_thb: string | number; stage: string }>(
      `select * from audit_runs`,
    );
    expect(run?.status).toBe("done");
    expect(run?.stage).toBe("12-scoring");   // every stage ran
    expect(Number(run?.cost_thb)).toBe(0);   // and none of them spent anything
    await db.close();
  });

  it("refuses without a domain", async () => {
    expect(await main([])).toBe(1);
  });

  it("refuses without an area or an explicit scope", async () => {
    expect(await main(["--domain=x.com"])).toBe(1);
  });

  it("accepts nationwide without an area", async () => {
    expect(await main(["--domain=x.com", "--scope=nationwide", "--dry-run"])).toBe(0);
    const db = await openDb();
    expect((await db.one<{ area_scope: string }>(`select * from clients`))?.area_scope)
      .toBe("nationwide");
    await db.close();
  });

  it("runs a second audit for the same domain against the same client", async () => {
    await main(["--domain=x.com", "--area=ภูเก็ต", "--dry-run"]);
    await main(["--domain=x.com", "--area=ภูเก็ต", "--dry-run"]);
    const db = await openDb();
    expect(await db.query(`select id from clients`)).toHaveLength(1);
    expect(await db.query(`select id from audit_runs`)).toHaveLength(2);
    await db.close();
  });

  it("fails the run, rather than hanging, when the site is not online", async () => {
    // Port 1 has nothing listening; intake must stop the run immediately
    // instead of letting six more stages spend time on a dead domain.
    expect(await main(["--domain=127.0.0.1:1", "--area=ภูเก็ต"])).toBe(1);
    const db = await openDb();
    const run = await db.one<{ status: string; error: string }>(`select * from audit_runs`);
    expect(run?.status).toBe("failed");
    expect(run?.error).toContain("เปิดเว็บไซต์ไม่ได้");
    await db.close();
  });
});

// ---------------------------------------------------------------------------
describe("the whole pipeline, against a local copy of the fixture site", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    const routes: Record<string, { body: string; type: string }> = {
      "/": { body: read("phuketmaid/index.html"), type: "text/html" },
      "/services/deep-cleaning/": {
        body: read("phuketmaid/services-deep-cleaning.html"), type: "text/html",
      },
      "/contact/": { body: read("phuketmaid/contact.html"), type: "text/html" },
      "/robots.txt": { body: read("phuketmaid/robots.txt"), type: "text/plain" },
    };
    server = createServer((req, res) => {
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
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    origin = `127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("crawls, classifies, applies the rules and scores — with no internet", async () => {
    expect(await main([`--domain=${origin}`, "--area=ภูเก็ต"])).toBe(0);

    const db = await openDb();
    const run = await db.one<{ id: string; status: string; stage: string }>(
      `select * from audit_runs`,
    );
    expect(run?.status).toBe("done");
    expect(run?.stage).toBe("12-scoring");

    // crawled and stored the pages
    const pages = await db.query<{ url: string; page_type: string }>(
      `select url, page_type from pages order by url`,
    );
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(pages.map((p) => p.page_type)).toContain("home");
    expect(pages.map((p) => p.page_type)).toContain("contact");

    // the findings this fixture is built to produce
    const found = (await getFindings(db, run!.id)).map((f) => f.code);
    for (const code of ["CVR-001", "CVR-002", "CVR-005", "ONP-002", "ONP-008", "TEC-004"]) {
      expect(found, `expected ${code}`).toContain(code);
    }

    // the highest-impact fix leads the report
    expect((await getFindings(db, run!.id))[0]!.code).toBe("CVR-001");

    // scores were stored as a snapshot, with the formula version alongside
    const snap = await db.one<{ data: { scoring_version: number; scores: { conversion: number } } }>(
      `select data from snapshots where kind = 'site' and target = 'scores'`,
    );
    const data = typeof snap!.data === "string" ? JSON.parse(snap!.data as never) : snap!.data;
    expect(data.scoring_version).toBe(CURRENT_SCORING_VERSION);
    expect(data.scores.conversion).toBeLessThan(30);

    // and it cost nothing: no paid API was called
    const cost = await db.one<{ cost_thb: string | number }>(`select cost_thb from audit_runs`);
    expect(Number(cost?.cost_thb)).toBe(0);
    await db.close();
  });

  it("--queue hands the run to the worker, which drives it to done", async () => {
    expect(await main([`--domain=${origin}`, "--area=ภูเก็ต", "--queue"])).toBe(0);

    const db = await openDb();
    expect((await db.one<{ status: string }>(`select * from audit_runs`))?.status).toBe("queued");
    expect((await db.one<{ status: string }>(`select * from jobs`))?.status).toBe("pending");

    const log = createLogger({ stdout: false });
    expect(await tick(db, log)).toBe(true);
    expect(await tick(db, log)).toBe(false); // queue empty

    expect((await db.one<{ status: string }>(`select * from audit_runs`))?.status).toBe("done");
    expect((await db.one<{ status: string }>(`select * from jobs`))?.status).toBe("done");
    await db.close();
  });

  it("re-running is free, because everything came from the cache", async () => {
    await main([`--domain=${origin}`, "--area=ภูเก็ต"]);
    await main([`--domain=${origin}`, "--area=ภูเก็ต"]);

    const db = await openDb();
    const rows = await db.query<{ cache_hit: boolean }>(
      `select cache_hit from api_calls a
         join audit_runs r on r.id = a.audit_run_id
        order by r.created_at desc, a.id`,
    );
    // The second run's fetches were served from disk.
    expect(rows.some((r) => r.cache_hit)).toBe(true);
    await db.close();
  });
});

// ---------------------------------------------------------------------------
/**
 * The readability gate. A fetch can "succeed" without ever seeing the site —
 * a bot wall answering 200 with its own page, or a JavaScript shell with no
 * text in it — and a run that scored either would report confident findings
 * about a page nobody saw. Both must stop at intake, with the reason stored,
 * and nothing written down as a fact about the site.
 */
describe("the readability gate — pages that are not the site are never scored", () => {
  async function serve(handler: (path: string, res: import("node:http").ServerResponse) => void) {
    const server = createServer((req, res) => handler((req.url ?? "/").split("?")[0]!, res));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    return {
      origin: `127.0.0.1:${port}`,
      close: () => new Promise<void>((r) => server.close(() => r())),
    };
  }

  async function failedRun() {
    const db = await openDb();
    const run = await db.one<{ status: string; error: string }>(`select * from audit_runs`);
    const pages = await db.query(`select id from pages`);
    const findings = await db.query(`select id from findings`);
    await db.close();
    return { run, pages: pages.length, findings: findings.length };
  }

  it("stops at a bot wall and names it, instead of scoring the wall's page", async () => {
    const site = await serve((_path, res) => {
      res.writeHead(503, { "content-type": "text/html", "cf-mitigated": "challenge" });
      res.end(`<html><head><title>Just a moment...</title></head><body>
        <div id="cf-chl-widget"></div>
        <script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script></body></html>`);
    });
    try {
      expect(await main([`--domain=${site.origin}`, "--area=ภูเก็ต"])).toBe(1);
      const { run, pages, findings } = await failedRun();
      expect(run?.status).toBe("failed");
      expect(run?.error).toContain("กันบอท");
      expect(run?.error).toContain("Cloudflare");
      expect(run?.error).not.toContain("เปิดเว็บไซต์ไม่ได้");
      expect(pages).toBe(0);
      expect(findings).toBe(0);
    } finally {
      await site.close();
    }
  });

  it("stops at a JavaScript app shell instead of reporting an empty page as a bad one", async () => {
    const site = await serve((path, res) => {
      if (path === "/robots.txt") { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><html><head><title>Shop</title></head><body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div><script src="/static/js/main.3f2a.js"></script></body></html>`);
    });
    try {
      expect(await main([`--domain=${site.origin}`, "--area=ภูเก็ต"])).toBe(1);
      const { run, pages, findings } = await failedRun();
      expect(run?.status).toBe("failed");
      expect(run?.error).toContain("JavaScript");
      expect(pages).toBe(0);
      expect(findings).toBe(0);
    } finally {
      await site.close();
    }
  });
});
