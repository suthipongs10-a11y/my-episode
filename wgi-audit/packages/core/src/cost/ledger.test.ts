import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db/client.ts";
import { closeSharedTestDb, sharedTestDb, truncateAll } from "../db/testing.ts";
import { createAuditRun, upsertClient } from "../db/queries.ts";
import { BudgetExceededError, Ledger } from "./ledger.ts";

let db: Db;
let runId: string;

beforeEach(async () => {
  db = await sharedTestDb();
  await truncateAll(db);
  const client = await upsertClient(db, { domain: "x.com", areaScope: "province", areas: ["ภูเก็ต"] });
  runId = (await createAuditRun(db, client.id)).id;
});

afterAll(closeSharedTestDb);

describe("Ledger", () => {
  it("accumulates cost across calls", async () => {
    const l = new Ledger(db, runId);
    await l.record({ provider: "dataforseo", endpoint: "serp", costThb: 1.25 });
    await l.record({ provider: "dataforseo", endpoint: "serp", costThb: 1.25 });
    expect(l.total()).toBe(2.5);
  });

  it("records cache hits at zero cost, because that is the number worth seeing", async () => {
    const l = new Ledger(db, runId);
    await l.record({ provider: "psi", endpoint: "psi", costThb: 0, cacheHit: true });
    const s = await l.summary();
    expect(s.calls).toBe(1);
    expect(s.cacheHits).toBe(1);
    expect(s.totalThb).toBe(0);
  });

  it("warns once when the soft budget is passed", async () => {
    const seen: number[] = [];
    const l = new Ledger(db, runId, { budgetThb: 10, onWarn: (spent) => seen.push(spent) });
    await l.record({ provider: "a", endpoint: "x", costThb: 6 });
    await l.record({ provider: "a", endpoint: "x", costThb: 6 }); // crosses 10
    await l.record({ provider: "a", endpoint: "x", costThb: 6 }); // no second warning
    expect(seen).toEqual([12]);
  });

  it("refuses the call that would breach the hard stop", async () => {
    const l = new Ledger(db, runId, { hardStopThb: 10 });
    await l.record({ provider: "a", endpoint: "x", costThb: 9 });
    await expect(
      l.record({ provider: "a", endpoint: "x", costThb: 5 }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    // The refused call must not be counted or written.
    expect(l.total()).toBe(9);
    const rows = await db.query(`select 1 from api_calls where audit_run_id = $1`, [runId]);
    expect(rows).toHaveLength(1);
  });

  it("still allows free calls after the budget is spent", async () => {
    const l = new Ledger(db, runId, { hardStopThb: 5 });
    await l.record({ provider: "a", endpoint: "x", costThb: 5 });
    await expect(
      l.record({ provider: "a", endpoint: "x", costThb: 0, cacheHit: true }),
    ).resolves.toBe(5);
  });

  it("summarises per provider, most expensive first", async () => {
    const l = new Ledger(db, runId);
    await l.record({ provider: "places", endpoint: "grid", costThb: 20, units: 25 });
    await l.record({ provider: "dataforseo", endpoint: "serp", costThb: 5, units: 30 });
    const s = await l.summary();
    expect(s.providers[0]!.provider).toBe("places");
    expect(s.providers[0]!.units).toBe(25);
    expect(s.totalThb).toBe(25);
  });

  it("writes the total back onto the run", async () => {
    const l = new Ledger(db, runId);
    await l.record({ provider: "a", endpoint: "x", costThb: 3.5 });
    await l.persistTotal();
    const row = await db.one<{ cost_thb: string | number }>(
      `select cost_thb from audit_runs where id = $1`, [runId],
    );
    expect(Number(row!.cost_thb)).toBe(3.5);
  });
});
