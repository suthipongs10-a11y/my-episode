/**
 * The cost ledger.
 *
 * Every external call is recorded here, cache hits included — a cache hit at
 * 0฿ is the evidence that caching is working, so leaving it out would hide the
 * number you most want to see while developing.
 *
 * The budget is enforced, not advisory: past the hard stop the pipeline throws
 * `BudgetExceededError` and the run fails loudly. A silent overrun on a
 * free-audit product is how a lead-generation tool turns into a bill.
 */
import type { Db } from "../db/client.ts";
import { th } from "../i18n/th.ts";

export interface CostEntry {
  provider: string;
  endpoint: string;
  units?: number;
  costThb?: number;
  cacheHit?: boolean;
}

export class BudgetExceededError extends Error {
  constructor(
    readonly spentThb: number,
    readonly limitThb: number,
  ) {
    super(th.cost.hardStop(spentThb.toFixed(2), limitThb.toFixed(2)));
    this.name = "BudgetExceededError";
  }
}

export interface LedgerOptions {
  budgetThb?: number;    // soft: warn past this
  hardStopThb?: number;  // hard: throw past this
  onWarn?: (spent: number, budget: number) => void;
}

export class Ledger {
  private spent = 0;
  private warned = false;

  constructor(
    private readonly db: Db,
    private readonly auditRunId: string,
    private readonly opts: LedgerOptions = {},
  ) {}

  /** What this run has spent so far, in THB. */
  total(): number {
    return round4(this.spent);
  }

  /**
   * Record one call. Returns the running total.
   *
   * Checks the budget *before* adding, so the call that would breach the hard
   * stop is refused rather than recorded and then complained about.
   */
  async record(entry: CostEntry): Promise<number> {
    const cost = entry.costThb ?? 0;
    const hard = this.opts.hardStopThb;

    if (hard !== undefined && cost > 0 && this.spent + cost > hard) {
      throw new BudgetExceededError(round4(this.spent + cost), hard);
    }

    this.spent += cost;

    await this.db.query(
      `insert into api_calls (audit_run_id, provider, endpoint, units, cost_thb, cache_hit)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        this.auditRunId,
        entry.provider,
        entry.endpoint,
        entry.units ?? 1,
        cost,
        entry.cacheHit ?? false,
      ],
    );

    const budget = this.opts.budgetThb;
    if (!this.warned && budget !== undefined && this.spent > budget) {
      this.warned = true;
      this.opts.onWarn?.(round4(this.spent), budget);
    }

    return this.total();
  }

  /** Per-provider breakdown, for `pnpm cost`. */
  async summary(): Promise<CostSummary> {
    const rows = await this.db.query<{
      provider: string;
      calls: string | number;
      cached: string | number;
      units: string | number | null;
      cost: string | number | null;
    }>(
      `select provider,
              count(*)                                   as calls,
              count(*) filter (where cache_hit)          as cached,
              coalesce(sum(units), 0)                    as units,
              coalesce(sum(cost_thb), 0)                 as cost
         from api_calls
        where audit_run_id = $1
        group by provider
        order by 5 desc`,
      [this.auditRunId],
    );

    const providers = rows.map((r) => ({
      provider: r.provider,
      calls: Number(r.calls),
      cacheHits: Number(r.cached),
      units: Number(r.units ?? 0),
      costThb: round4(Number(r.cost ?? 0)),
    }));

    return {
      providers,
      calls: providers.reduce((a, p) => a + p.calls, 0),
      cacheHits: providers.reduce((a, p) => a + p.cacheHits, 0),
      totalThb: round4(providers.reduce((a, p) => a + p.costThb, 0)),
    };
  }

  /** Write the run's total back onto the audit_runs row. */
  async persistTotal(): Promise<void> {
    await this.db.query(`update audit_runs set cost_thb = $2 where id = $1`, [
      this.auditRunId,
      this.total(),
    ]);
  }
}

export interface CostSummary {
  providers: {
    provider: string;
    calls: number;
    cacheHits: number;
    units: number;
    costThb: number;
  }[];
  calls: number;
  cacheHits: number;
  totalThb: number;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
