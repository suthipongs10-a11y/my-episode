/** `pnpm cost --run=<uuid>` — what one audit actually cost, by provider. */
import { createDb } from "@core/db/client.ts";
import { Ledger } from "@core/cost/ledger.ts";

const runId = process.argv.slice(2)
  .map((a) => /^--run=(.+)$/.exec(a)?.[1])
  .find(Boolean);

if (!runId) {
  process.stderr.write("ใช้: pnpm cost --run=<uuid>\n");
  process.exit(1);
}

const db = await createDb();
try {
  const summary = await new Ledger(db, runId).summary();
  const rows = summary.providers.map((p) =>
    `  ${p.provider.padEnd(24)} ${String(p.calls).padStart(5)} calls  ` +
    `${String(p.cacheHits).padStart(5)} cached  ${p.costThb.toFixed(4).padStart(10)} ฿`);
  process.stdout.write(
    [`ต้นทุนของ run ${runId}`, ...rows,
     `  ${"รวม".padEnd(24)} ${String(summary.calls).padStart(5)} calls  ` +
     `${String(summary.cacheHits).padStart(5)} cached  ${summary.totalThb.toFixed(4).padStart(10)} ฿`,
    ].join("\n") + "\n");
} finally {
  await db.close();
}
