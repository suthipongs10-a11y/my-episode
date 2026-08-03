/**
 * The pipeline runner.
 *
 * A fixed, ordered list of stages — not an agent. The LLM never chooses what
 * happens next, so the same site produces the same result every time (the
 * narrative prose aside). Each stage records its raw output as a snapshot and
 * marks itself complete on `audit_runs.stage`, which is what lets an
 * interrupted run resume instead of starting over and paying twice.
 */
import type { Db } from "../db/client.ts";
import type { Ledger } from "../cost/ledger.ts";
import type { CachedFetch } from "../http/cached-fetch.ts";
import type { Logger } from "../log/logger.ts";
import type { AuditRun, Client, Stage } from "../types/index.ts";
import { STAGES } from "../types/index.ts";
import { finishRun, markRunStarted, setRunStage } from "../db/queries.ts";
import { BudgetExceededError } from "../cost/ledger.ts";

export interface StageContext {
  db: Db;
  http: CachedFetch;
  ledger: Ledger;
  log: Logger;
  client: Client;
  run: AuditRun;
  /** No external calls at all. Stages must honour this. */
  dryRun: boolean;
  /** Scratch space shared between stages within one run. */
  state: Map<string, unknown>;
}

export interface PipelineStage {
  name: Stage;
  run(ctx: StageContext): Promise<void>;
}

export interface RunOptions {
  /** Restrict to these stages, e.g. ["03-crawl","04-classify"]. */
  only?: Stage[];
  /** Skip stages already recorded complete on the run. */
  resume?: boolean;
  dryRun?: boolean;
}

export interface RunResult {
  status: "done" | "failed";
  stagesRun: Stage[];
  error?: string;
  costThb: number;
}

/** Registered stages, in pipeline order. Milestones append to this. */
export function orderStages(stages: PipelineStage[]): PipelineStage[] {
  const index = new Map<string, number>(STAGES.map((s, i) => [s, i]));
  return [...stages].sort(
    (a, b) => (index.get(a.name) ?? 99) - (index.get(b.name) ?? 99),
  );
}

export async function runPipeline(
  ctx: Omit<StageContext, "dryRun" | "state">,
  stages: PipelineStage[],
  opts: RunOptions = {},
): Promise<RunResult> {
  const ordered = orderStages(stages);
  const wanted = opts.only ? new Set<string>(opts.only) : null;

  const full: StageContext = {
    ...ctx,
    dryRun: opts.dryRun ?? false,
    state: new Map(),
  };

  const stagesRun: Stage[] = [];
  await markRunStarted(ctx.db, ctx.run.id);
  if (full.dryRun) ctx.log.warn("dry run: no external calls will be made");

  // Resume means: everything up to and including the recorded stage is done.
  const doneThrough =
    opts.resume && ctx.run.stage
      ? STAGES.indexOf(ctx.run.stage)
      : -1;

  try {
    for (const stage of ordered) {
      if (wanted && !wanted.has(stage.name)) continue;
      if (STAGES.indexOf(stage.name) <= doneThrough) {
        ctx.log.debug(`skip ${stage.name} (already complete)`);
        continue;
      }

      const started = Date.now();
      const log = ctx.log.child({ stage: stage.name, runId: ctx.run.id });
      log.info("start");
      await stage.run({ ...full, log });
      await setRunStage(ctx.db, ctx.run.id, stage.name);
      stagesRun.push(stage.name);
      log.info("done", { ms: Date.now() - started, costThb: ctx.ledger.total() });
    }

    await ctx.ledger.persistTotal();
    await finishRun(ctx.db, ctx.run.id, "done");
    return { status: "done", stagesRun, costThb: ctx.ledger.total() };
  } catch (err) {
    const message =
      err instanceof BudgetExceededError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    ctx.log.error("pipeline failed", { error: message });
    await ctx.ledger.persistTotal();
    await finishRun(ctx.db, ctx.run.id, "failed", message);
    return { status: "failed", stagesRun, error: message, costThb: ctx.ledger.total() };
  }
}
