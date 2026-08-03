/**
 * The same assertions, against a real Postgres.
 *
 * Skipped unless `DATABASE_URL` is set, so `pnpm test` stays offline and free.
 * Run it before a release, and in CI where a Postgres service is available:
 *
 *   DATABASE_URL=postgresql://... pnpm test
 *
 * This file exists because of a bug the PGlite tests could not have caught.
 * The two drivers encode a jsonb parameter differently — postgres.js infers the
 * type from the JavaScript value, so a pre-stringified object arrived as a
 * jsonb *string*. Reading it back in JavaScript still worked, so nothing
 * failed; but `evidence->>'key'` returned nothing, which would have quietly
 * broken every report query in production. A driver difference needs a test
 * that runs on both drivers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySchema, createPostgresDb, type Db } from "./client.ts";
import { createAuditRun, getSnapshots, saveFindings, saveSnapshot, upsertClient } from "./queries.ts";

const URL = process.env.DATABASE_URL;
const suite = URL ? describe : describe.skip;

suite("real Postgres", () => {
  let db: Db;
  let runId: string;

  beforeAll(async () => {
    db = await createPostgresDb(URL!);
    await applySchema(db);
    // Leave no trace in a database that might not be a throwaway.
    await db.exec(`truncate clients cascade`);
    const client = await upsertClient(db, {
      domain: "integration.test", areaScope: "province", areas: ["ภูเก็ต"],
    });
    runId = (await createAuditRun(db, client.id)).id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.exec(`truncate clients cascade`);
    await db.close();
  });

  it("applies the same schema.sql", async () => {
    const rows = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' order by 1`,
    );
    expect(rows.map((r) => r.table_name)).toContain("snapshots");
    expect(rows.map((r) => r.table_name)).not.toContain("scores");
  });

  it("stores snapshot data as queryable jsonb, not a string", async () => {
    await saveSnapshot(db, runId, "site", "scores", {
      scoring_version: 1, scores: { conversion: 12, overall: 34 },
    });
    const row = await db.one<{ kind: string; conversion: string; version: string }>(
      `select jsonb_typeof(data) as kind,
              data->'scores'->>'conversion' as conversion,
              data->>'scoring_version' as version
         from snapshots where target = 'scores'`,
    );
    expect(row?.kind).toBe("object");
    expect(row?.conversion).toBe("12");
    expect(row?.version).toBe("1");
  });

  it("stores finding evidence as queryable jsonb", async () => {
    await saveFindings(db, runId, [{
      code: "CVR-001", category: "conversion", severity: "critical",
      evidence: { pages_without_tel_link: 12, pages_total: 14 },
      affectedUrls: ["https://x.test/a"],
    }]);
    const row = await db.one<{ kind: string; n: string; urls: number }>(
      `select jsonb_typeof(evidence) as kind,
              evidence->>'pages_without_tel_link' as n,
              array_length(affected_urls, 1) as urls
         from findings where code = 'CVR-001'`,
    );
    expect(row?.kind).toBe("object");
    expect(row?.n).toBe("12");
    expect(Number(row?.urls)).toBe(1);
  });

  it("round-trips Thai text through jsonb and text[]", async () => {
    await saveSnapshot(db, runId, "page", "https://x.test/a", {
      title: "บริการทำความสะอาดบ้าน ป่าตอง",
    });
    const [snap] = await getSnapshots<{ title: string }>(db, runId, "page");
    expect(snap?.data.title).toBe("บริการทำความสะอาดบ้าน ป่าตอง");

    const client = await db.one<{ areas: string[] }>(`select areas from clients limit 1`);
    expect(client?.areas).toEqual(["ภูเก็ต"]);
  });

  it("claims a job exactly once, using SKIP LOCKED", async () => {
    const { claimJob, enqueueJob } = await import("./queries.ts");
    await enqueueJob(db, runId);
    expect(await claimJob(db)).not.toBeNull();
    expect(await claimJob(db)).toBeNull();
  });
});
