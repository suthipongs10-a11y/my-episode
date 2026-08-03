/**
 * The worker: poll `jobs`, run whatever it finds.
 *
 * A table and a five-second poll rather than Redis. At a few audits a day the
 * queue is never the bottleneck, and this survives a restart with no extra
 * service to run, pay for, or monitor.
 */
import { applySchema, createDb, type Db } from "@core/db/client.ts";
import { claimJob, completeJob } from "@core/db/queries.ts";
import { createLogger, type Logger } from "@core/log/logger.ts";
import type { Client } from "@core/types/index.ts";
import { runAudit } from "./run-audit.ts";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS ?? 3);

/** Take one job if there is one. Returns false when the queue is empty. */
export async function tick(db: Db, log: Logger): Promise<boolean> {
  const job = await claimJob(db);
  if (!job) return false;

  const jobId = String(job.id);
  const jobLog = log.child({ runId: job.audit_run_id });

  if (job.attempts > MAX_ATTEMPTS) {
    jobLog.error("job exceeded max attempts, giving up", { jobId, attempts: job.attempts });
    await completeJob(db, job.id, "failed");
    return true;
  }

  jobLog.info("claimed job", { jobId, attempt: job.attempts });
  try {
    const client = await db.one<Client>(
      `select c.* from clients c
         join audit_runs r on r.client_id = c.id
        where r.id = $1`,
      [job.audit_run_id],
    );
    if (!client) throw new Error(`no client for run ${job.audit_run_id}`);

    const result = await runAudit(db, client, job.audit_run_id, { resume: true, log: jobLog });
    await completeJob(db, job.id, result.status === "done" ? "done" : "failed");
  } catch (err) {
    jobLog.error("job threw", { jobId, error: err instanceof Error ? err.message : String(err) });
    await completeJob(db, job.id, "failed");
  }
  return true;
}

export async function start(): Promise<void> {
  const log = createLogger({ stage: "worker" });
  const db = await createDb();
  await applySchema(db);
  log.info("worker started", { pollMs: POLL_MS, driver: db.driver });

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    log.info("stopping…");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopping) {
    try {
      // Drain the queue before sleeping, so a burst is not paced at one per tick.
      let worked = true;
      while (worked && !stopping) worked = await tick(db, log);
    } catch (err) {
      log.error("poll failed", { error: err instanceof Error ? err.message : String(err) });
    }
    if (!stopping) await sleep(POLL_MS);
  }
  await db.close();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((err: unknown) => {
    process.stderr.write(String(err instanceof Error ? err.stack : err) + "\n");
    process.exit(1);
  });
}
