/**
 * Wiring one audit run: build the dependencies, run the pipeline, report back.
 * Shared by the CLI (run it now) and the worker (run what the queue hands you).
 */
import { CachedFetch } from "@core/http/cached-fetch.ts";
import { Ledger } from "@core/cost/ledger.ts";
import { STAGE_REGISTRY, runPipeline, type RunOptions, type RunResult } from "@core/pipeline/index.ts";
import { createLogger, type Logger } from "@core/log/logger.ts";
import { env } from "@core/env.ts";
import { getAuditRun } from "@core/db/queries.ts";
import { th } from "@core/i18n/th.ts";
import type { Client } from "@core/types/index.ts";
import type { Db } from "@core/db/client.ts";

export interface RunAuditOptions extends RunOptions {
  log?: Logger;
}

export async function runAudit(
  db: Db,
  client: Client,
  auditRunId: string,
  opts: RunAuditOptions = {},
): Promise<RunResult> {
  const e = env();
  const log = opts.log ?? createLogger({ runId: auditRunId });

  const run = await getAuditRun(db, auditRunId);
  if (!run) throw new Error(`audit run not found: ${auditRunId}`);

  const ledger = new Ledger(db, auditRunId, {
    budgetThb: e.COST_BUDGET_THB,
    hardStopThb: e.COST_HARD_STOP_THB,
    onWarn: (spent, budget) =>
      log.warn(th.cost.overBudget, { spentThb: spent, budgetThb: budget }),
  });

  const http = new CachedFetch({
    ledger,
    cacheDir: e.CACHE_DIR,
    userAgent: e.HTTP_USER_AGENT,
    perDomainDelayMs: e.HTTP_DELAY_MS,
  });

  return runPipeline({ db, http, ledger, log, client, run }, STAGE_REGISTRY, opts);
}
