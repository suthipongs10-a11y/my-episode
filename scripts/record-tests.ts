/**
 * Writes the last test result to `.ctx-tests` so `pnpm ctx` can report it
 * without re-running the suite. Invoked by the `test` script.
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const report = join(root, ".vitest.json");
if (existsSync(report)) {
  const r = JSON.parse(readFileSync(report, "utf8")) as {
    numPassedTests: number; numTotalTests: number; success: boolean;
  };
  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  writeFileSync(
    join(root, ".ctx-tests"),
    `${r.numPassedTests}/${r.numTotalTests} passed${r.success ? "" : " (FAILING)"} · ${when}\n`,
  );
  rmSync(report);
}
