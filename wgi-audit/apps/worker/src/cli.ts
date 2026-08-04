/**
 * `pnpm audit` — start an audit from the command line.
 *
 *   pnpm audit --domain=example.com --area=ภูเก็ต
 *   pnpm audit --domain=example.com --scope=nationwide
 *   pnpm audit --domain=example.com --only=03-crawl,04-classify
 *   pnpm audit --run=<uuid> --resume
 *   pnpm audit --domain=example.com --dry-run     # no external calls, no cost
 *   pnpm audit --domain=example.com --queue       # hand it to the worker instead
 */
import { applySchema, createDb } from "@core/db/client.ts";
import { createAuditRun, enqueueJob, getAuditRun, upsertClient } from "@core/db/queries.ts";
import { createLogger } from "@core/log/logger.ts";
import { th } from "@core/i18n/th.ts";
import { AreaScope, STAGES, type Stage } from "@core/types/index.ts";
import { normaliseDomain } from "@core/crawl/domain.ts";
import { runAudit } from "./run-audit.ts";

interface Args {
  domain?: string;
  areas: string[];
  scope?: string;
  only?: Stage[];
  run?: string;
  resume: boolean;
  dryRun: boolean;
  queue: boolean;
  help: boolean;
}

export { normaliseDomain };

export function parseArgs(argv: string[]): Args {
  const args: Args = { areas: [], resume: false, dryRun: false, queue: false, help: false };
  for (const raw of argv) {
    const [key, ...rest] = raw.replace(/^--/, "").split("=");
    const value = rest.join("=");
    switch (key) {
      case "domain": args.domain = normaliseDomain(value); break;
      case "area": args.areas.push(...value.split(",").map((s) => s.trim()).filter(Boolean)); break;
      case "scope": args.scope = value; break;
      case "run": args.run = value; break;
      case "only":
        args.only = value.split(",").map((s) => s.trim()).filter(isStage);
        break;
      case "resume": args.resume = true; break;
      case "dry-run": args.dryRun = true; break;
      case "queue": args.queue = true; break;
      case "help": case "h": args.help = true; break;
    }
  }
  return args;
}

function isStage(s: string): s is Stage {
  return (STAGES as readonly string[]).includes(s);
}


const USAGE = `
pnpm audit --domain=<domain> [--area=<พื้นที่>] [options]

  --domain=example.com     เว็บไซต์ที่จะตรวจ (จำเป็น)
  --area=ภูเก็ต             พื้นที่เป้าหมาย ใส่หลายอันคั่นด้วย ,
  --scope=nationwide       ถ้าไม่เจาะพื้นที่ (ค่าเริ่มต้นเดาจาก --area)
  --only=03-crawl,04-...   รันเฉพาะบางขั้น (ใช้ cache)
  --run=<uuid> --resume    รันงานเดิมต่อจากขั้นที่ทำค้างไว้
  --dry-run                ไม่เรียก API ภายนอกเลย
  --queue                  ใส่คิวให้ worker ทำ แทนที่จะรันทันที
`.trim();

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const log = createLogger();

  if (args.help) {
    process.stdout.write(USAGE + "\n");
    return 0;
  }

  const db = await createDb();
  try {
    // A fresh clone has no tables; creating them here means the first command
    // a new developer runs is the one they wanted, not a setup step.
    await applySchema(db);

    // Resume an existing run.
    if (args.run) {
      const run = await getAuditRun(db, args.run);
      if (!run) {
        log.error(`ไม่พบงานตรวจ id นี้: ${args.run}`);
        return 1;
      }
      const client = await db.one<{ id: string }>(
        `select * from clients where id = $1`, [run.client_id],
      );
      if (!client) {
        log.error("งานตรวจนี้ไม่มีข้อมูลลูกค้า");
        return 1;
      }
      const result = await runAudit(db, client as never, run.id, {
        ...(args.only ? { only: args.only } : {}),
        resume: args.resume,
        dryRun: args.dryRun,
        log,
      });
      return report(result, log, run.id);
    }

    if (!args.domain) {
      log.error(th.cli.domainRequired);
      process.stdout.write("\n" + USAGE + "\n");
      return 1;
    }

    const scope = resolveScope(args);
    if (!scope) {
      log.error(th.cli.areaRequired);
      return 1;
    }

    const client = await upsertClient(db, {
      domain: args.domain,
      areaScope: scope,
      areas: args.areas,
      leadSource: "cli",
    });
    const run = await createAuditRun(db, client.id);
    log.info(th.cli.runCreated, { runId: run.id, domain: client.domain, scope });

    if (args.queue) {
      const job = await enqueueJob(db, run.id);
      log.info("เข้าคิวแล้ว รอ worker ทำงาน", { jobId: String(job.id), runId: run.id });
      return 0;
    }

    if (args.dryRun) log.warn(th.cli.dryRun);

    const result = await runAudit(db, client, run.id, {
      ...(args.only ? { only: args.only } : {}),
      resume: args.resume,
      dryRun: args.dryRun,
      log,
    });
    return report(result, log, run.id);
  } finally {
    await db.close();
  }
}

function resolveScope(args: Args): AreaScope | null {
  if (args.scope) {
    const parsed = AreaScope.safeParse(args.scope);
    return parsed.success ? parsed.data : null;
  }
  if (args.areas.length > 0) return "province";
  return null;
}

function report(
  result: { status: string; stagesRun: string[]; error?: string; costThb: number },
  log: ReturnType<typeof createLogger>,
  runId: string,
): number {
  if (result.status === "done") {
    log.info(th.cli.runDone, {
      runId,
      stages: result.stagesRun.length,
      costThb: result.costThb,
    });
    return 0;
  }
  log.error(th.cli.runFailed, { runId, error: result.error ?? "" });
  return 1;
}

// Run only when invoked directly, so tests can import `main` without executing.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (err: unknown) => {
      process.stderr.write(String(err instanceof Error ? err.stack : err) + "\n");
      process.exit(1);
    },
  );
}
