/**
 * The schema and its queries, exercised against a real Postgres (PGlite,
 * in-process). No mocks: if `schema.sql` is wrong, these fail.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { applySchema, type Db } from "./client.ts";
import { closeSharedTestDb, isolatedTestDb, sharedTestDb, truncateAll } from "./testing.ts";
import {
  claimJob, completeJob, createAuditRun, enqueueJob, finishRun, getAuditRun,
  getFindings, getSnapshots, markRunStarted, saveFindings, saveSnapshot,
  setRunStage, upsertClient,
} from "./queries.ts";

let db: Db;

beforeEach(async () => {
  db = await sharedTestDb();
  await truncateAll(db);
});

afterAll(closeSharedTestDb);

async function seed() {
  const client = await upsertClient(db, {
    domain: "phuketmaidservice.com",
    areaScope: "province",
    areas: ["ภูเก็ต", "ป่าตอง"],
  });
  const run = await createAuditRun(db, client.id);
  return { client, run };
}

describe("schema", () => {
  it("applies cleanly and is idempotent", async () => {
    const fresh = await isolatedTestDb();
    await applySchema(fresh); // second time must not throw
    const tables = await fresh.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = tables.map((t) => t.table_name).sort();
    expect(names).toEqual([
      "api_calls", "audit_runs", "clients", "competitors", "findings",
      "jobs", "keywords", "narratives", "pages", "rankings", "snapshots",
    ]);
    await fresh.close();
  });

  it("has no scores table — scores are derived at read time", async () => {
    const rows = await db.query(
      `select 1 from information_schema.tables
        where table_schema='public' and table_name='scores'`,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("clients", () => {
  it("stores Thai areas as a real array", async () => {
    const { client } = await seed();
    expect(client.areas).toEqual(["ภูเก็ต", "ป่าตอง"]);
  });

  it("reuses the client for a domain instead of duplicating it", async () => {
    const { client } = await seed();
    const again = await upsertClient(db, {
      domain: "phuketmaidservice.com",
      areaScope: "district",
      areas: ["ป่าตอง"],
    });
    expect(again.id).toBe(client.id);
    expect(again.area_scope).toBe("district");

    const all = await db.query(`select id from clients`);
    expect(all).toHaveLength(1);
  });

  it("does not wipe fields that the new call omitted", async () => {
    await upsertClient(db, {
      domain: "x.com", areaScope: "province", areas: ["ภูเก็ต"],
      contactPhone: "076-000000", name: "ร้านทดสอบ",
    });
    const updated = await upsertClient(db, {
      domain: "x.com", areaScope: "province", areas: ["ภูเก็ต"],
    });
    expect(updated.contact_phone).toBe("076-000000");
    expect(updated.name).toBe("ร้านทดสอบ");
  });
});

describe("audit runs", () => {
  it("starts queued and can be walked to done", async () => {
    const { run } = await seed();
    expect(run.status).toBe("queued");

    await markRunStarted(db, run.id);
    await setRunStage(db, run.id, "03-crawl");
    await finishRun(db, run.id, "done");

    const after = await getAuditRun(db, run.id);
    expect(after?.status).toBe("done");
    expect(after?.stage).toBe("03-crawl");
    expect(after?.finished_at).toBeTruthy();
  });

  it("records the error when it fails", async () => {
    const { run } = await seed();
    await finishRun(db, run.id, "failed", "เปิดเว็บไซต์ไม่ได้");
    const after = await getAuditRun(db, run.id);
    expect(after?.status).toBe("failed");
    expect(after?.error).toBe("เปิดเว็บไซต์ไม่ได้");
  });
});

describe("snapshots", () => {
  it("round-trips jsonb including Thai text", async () => {
    const { run } = await seed();
    await saveSnapshot(db, run.id, "page", "https://x.com/a", {
      title: "บริการทำความสะอาดบ้าน ป่าตอง",
      wordCount: 640,
      nested: { schema: ["LocalBusiness"] },
    });
    const rows = await getSnapshots<{ title: string; nested: { schema: string[] } }>(
      db, run.id, "page",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.target).toBe("https://x.com/a");
    expect(rows[0]!.data.title).toBe("บริการทำความสะอาดบ้าน ป่าตอง");
    expect(rows[0]!.data.nested.schema).toEqual(["LocalBusiness"]);
  });

  it("stores jsonb as an object, not as a string containing JSON", async () => {
    // Without an explicit ::jsonb cast the driver stores the JSON *string*, so
    // jsonb_typeof says "string" and `data->>'key'` finds nothing. Reading it
    // back in JavaScript still worked, because getSnapshots parses a string if
    // it sees one — which is exactly why this has to be asserted in SQL.
    const { run } = await seed();
    await saveSnapshot(db, run.id, "site", "scores", { scores: { conversion: 12 } });

    const row = await db.one<{ kind: string; conversion: string }>(
      `select jsonb_typeof(data) as kind, data->'scores'->>'conversion' as conversion
         from snapshots where target = 'scores'`,
    );
    expect(row?.kind).toBe("object");
    expect(row?.conversion).toBe("12");
  });

  it("keeps kinds separate", async () => {
    const { run } = await seed();
    await saveSnapshot(db, run.id, "page", "a", { n: 1 });
    await saveSnapshot(db, run.id, "psi", "b", { n: 2 });
    expect(await getSnapshots(db, run.id, "page")).toHaveLength(1);
    expect(await getSnapshots(db, run.id, "psi")).toHaveLength(1);
  });
});

describe("findings", () => {
  it("preserves evidence and priority order", async () => {
    const { run } = await seed();
    await saveFindings(db, run.id, [
      {
        code: "CVR-001", category: "conversion", severity: "critical",
        evidence: { pages_without_tel_link: 12, pages_total: 14 },
        affectedUrls: ["https://x.com/a", "https://x.com/b"],
        effortHours: 3, impactScore: 9,
      },
      {
        code: "ONP-004", category: "onpage", severity: "medium",
        evidence: { pages_without_meta: 5 },
      },
    ]);
    const got = await getFindings(db, run.id);
    expect(got.map((f) => f.code)).toEqual(["CVR-001", "ONP-004"]);
    expect(got[0]!.evidence).toEqual({ pages_without_tel_link: 12, pages_total: 14 });
    expect(got[0]!.affectedUrls).toHaveLength(2);
    expect(got[0]!.effortHours).toBe(3);
    expect(got[1]!.effortHours).toBeUndefined();
  });

  it("stores evidence as queryable jsonb", async () => {
    const { run } = await seed();
    await saveFindings(db, run.id, [{
      code: "CVR-001", category: "conversion", severity: "critical",
      evidence: { pages_without_tel_link: 12, pages_total: 14 },
    }]);
    const row = await db.one<{ kind: string; n: string }>(
      `select jsonb_typeof(evidence) as kind,
              evidence->>'pages_without_tel_link' as n
         from findings where code = 'CVR-001'`,
    );
    expect(row?.kind).toBe("object");
    expect(row?.n).toBe("12");
  });
});

describe("jobs", () => {
  it("claims a pending job exactly once", async () => {
    const { run } = await seed();
    await enqueueJob(db, run.id);

    const first = await claimJob(db);
    expect(first).not.toBeNull();
    expect(first!.status).toBe("running");
    expect(first!.attempts).toBe(1);

    // Already claimed: a second poll must find nothing.
    expect(await claimJob(db)).toBeNull();

    await completeJob(db, first!.id, "done");
    const row = await db.one<{ status: string }>(`select status from jobs limit 1`);
    expect(row?.status).toBe("done");
  });

  it("serves jobs oldest first", async () => {
    const { client } = await seed();
    const a = await createAuditRun(db, client.id);
    const b = await createAuditRun(db, client.id);
    await enqueueJob(db, a.id);
    await enqueueJob(db, b.id);

    expect((await claimJob(db))!.audit_run_id).toBe(a.id);
    expect((await claimJob(db))!.audit_run_id).toBe(b.id);
  });
});
