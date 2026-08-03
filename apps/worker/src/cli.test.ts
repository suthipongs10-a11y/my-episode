/**
 * M0 acceptance, as an executable test.
 *
 * "Run the CLI and see an audit_run reach `done` in the database" — checked
 * here against a real (in-process) Postgres, so the milestone cannot silently
 * regress once M1 starts adding stages.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@core/db/client.ts";
import { resetEnv } from "@core/env.ts";
import { main, normaliseDomain, parseArgs } from "./cli.ts";
import { tick } from "./index.ts";
import { createLogger } from "@core/log/logger.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "wgi-cli-"));
  // Point the CLI at a throwaway database and cache for this test only.
  process.env.PGLITE_DIR = join(dir, "db");
  process.env.CACHE_DIR = join(dir, "cache");
  delete process.env.DATABASE_URL;
  resetEnv();
});

afterEach(async () => {
  delete process.env.PGLITE_DIR;
  delete process.env.CACHE_DIR;
  resetEnv();
  await rm(dir, { recursive: true, force: true });
});

async function openDb(): Promise<Db> {
  return createDb({ dataDir: join(dir, "db") });
}

describe("parseArgs", () => {
  it("reads domain, areas and flags", () => {
    const a = parseArgs(["--domain=https://www.Example.com/path", "--area=ภูเก็ต,ป่าตอง", "--dry-run"]);
    expect(a.domain).toBe("example.com");
    expect(a.areas).toEqual(["ภูเก็ต", "ป่าตอง"]);
    expect(a.dryRun).toBe(true);
  });

  it("keeps only real stage names in --only", () => {
    const a = parseArgs(["--only=03-crawl,nonsense,05-psi"]);
    expect(a.only).toEqual(["03-crawl", "05-psi"]);
  });
});

describe("normaliseDomain", () => {
  it("strips scheme, www, path and case", () => {
    expect(normaliseDomain("HTTPS://WWW.Example.com/a/b?c=1")).toBe("example.com");
    expect(normaliseDomain("example.co.th")).toBe("example.co.th");
  });
});

describe("pnpm audit (M0 acceptance)", () => {
  it("creates a client and an audit_run that reaches done", async () => {
    const code = await main(["--domain=phuketmaidservice.com", "--area=ภูเก็ต"]);
    expect(code).toBe(0);

    const db = await openDb();
    const client = await db.one<{ id: string; domain: string; areas: string[] }>(
      `select * from clients`,
    );
    expect(client?.domain).toBe("phuketmaidservice.com");
    expect(client?.areas).toEqual(["ภูเก็ต"]);

    const run = await db.one<{ status: string; cost_thb: string | number }>(
      `select * from audit_runs`,
    );
    expect(run?.status).toBe("done");
    // M0 registers no stages, so the run must have cost nothing.
    expect(Number(run?.cost_thb)).toBe(0);
    await db.close();
  });

  it("refuses without a domain", async () => {
    expect(await main([])).toBe(1);
  });

  it("refuses without an area or an explicit scope", async () => {
    expect(await main(["--domain=x.com"])).toBe(1);
  });

  it("accepts nationwide without an area", async () => {
    expect(await main(["--domain=x.com", "--scope=nationwide"])).toBe(0);
    const db = await openDb();
    const c = await db.one<{ area_scope: string }>(`select * from clients`);
    expect(c?.area_scope).toBe("nationwide");
    await db.close();
  });

  it("runs a second audit for the same domain against the same client", async () => {
    await main(["--domain=x.com", "--area=ภูเก็ต"]);
    await main(["--domain=x.com", "--area=ภูเก็ต"]);
    const db = await openDb();
    expect(await db.query(`select id from clients`)).toHaveLength(1);
    expect(await db.query(`select id from audit_runs`)).toHaveLength(2);
    await db.close();
  });

  it("--queue leaves the run for the worker rather than running it", async () => {
    expect(await main(["--domain=x.com", "--area=ภูเก็ต", "--queue"])).toBe(0);

    const db = await openDb();
    const run = await db.one<{ status: string }>(`select * from audit_runs`);
    expect(run?.status).toBe("queued");
    const job = await db.one<{ status: string }>(`select * from jobs`);
    expect(job?.status).toBe("pending");

    // The worker picks it up and drives it to done.
    const log = createLogger({ stdout: false });
    expect(await tick(db, log)).toBe(true);
    expect(await tick(db, log)).toBe(false); // queue now empty

    const after = await db.one<{ status: string }>(`select * from audit_runs`);
    expect(after?.status).toBe("done");
    const doneJob = await db.one<{ status: string }>(`select * from jobs`);
    expect(doneJob?.status).toBe("done");
    await db.close();
  });
});
