/**
 * `pnpm ctx` — the compact project state, for starting a new AI session cheaply.
 *
 * Reading a repo to work out where you left off costs thousands of tokens every
 * time. This prints the same answer in a few hundred characters: which
 * milestone, what is registered, what the tests say, what changed last, and the
 * one next action. Paste it in, skip the archaeology.
 *
 *   pnpm ctx           human-readable
 *   pnpm ctx --json    machine-readable
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isEntryPoint } from "../packages/core/src/entry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Ctx {
  milestone: string;
  status: string;
  stagesRegistered: string[];
  rulesImplemented: string[];
  tests: string;
  lastCommits: string[];
  changedFiles: string[];
  nextAction: string;
}

function sh(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function readIfExists(p: string): string {
  const full = join(ROOT, p);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

/** Pull "| Milestone ปัจจุบัน | **M0 — Skeleton** |" style rows out of STATUS.md. */
function fromStatus(label: string): string {
  const status = readIfExists("STATUS.md");
  const row = new RegExp(`\\|\\s*${label}[^|]*\\|([^|]+)\\|`).exec(status);
  return row?.[1]?.replace(/\*/g, "").trim() ?? "unknown";
}

function stagesRegistered(): string[] {
  const src = readIfExists("packages/core/src/pipeline/index.ts");
  const body = /STAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? "";
  return [...body.matchAll(/(\w+Stage)\b/g)].map((m) => m[1]!);
}

function rulesImplemented(): string[] {
  const src = readIfExists("packages/core/src/rules/catalog.ts");
  return [...src.matchAll(/"([A-Z]{3}-\d{3})"\s*:/g)].map((m) => m[1]!);
}

function nextAction(): string {
  const status = readIfExists("STATUS.md");
  const m = /^\s*-\s*\[ \]\s*(.+)$/m.exec(status);
  return m?.[1]?.trim() ?? "ดู STATUS.md";
}

/**
 * Last recorded test result, written by `pnpm test` (see scripts/record-tests.ts).
 * Running the suite from here would make `ctx` slow and occasionally fail for
 * reasons that have nothing to do with reporting state.
 */
function testSummary(): string {
  return readIfExists(".ctx-tests").trim() || "ยังไม่ได้รัน (`pnpm test`)";
}

export function collect(): Ctx {
  return {
    milestone: fromStatus("Milestone"),
    status: fromStatus("สถานะ"),
    stagesRegistered: stagesRegistered(),
    rulesImplemented: rulesImplemented(),
    tests: testSummary(),
    lastCommits: sh("git", ["log", "--oneline", "-5"]).split("\n").filter(Boolean),
    changedFiles: sh("git", ["status", "--porcelain"]).split("\n").filter(Boolean).slice(0, 20),
    nextAction: nextAction(),
  };
}

function render(c: Ctx): string {
  const rules = c.rulesImplemented.length
    ? `${c.rulesImplemented.length} rules: ${summariseRules(c.rulesImplemented)}`
    : "ยังไม่มี rules";
  return [
    `# wgi-audit — ${c.milestone} (${c.status})`,
    `stages: ${c.stagesRegistered.length ? c.stagesRegistered.join(", ") : "ยังไม่ลงทะเบียน"}`,
    `rules : ${rules}`,
    `tests : ${c.tests}`,
    `git   : ${c.lastCommits[0] ?? "no commits"}`,
    c.changedFiles.length ? `dirty : ${c.changedFiles.length} files` : "dirty : clean",
    `next  : ${c.nextAction}`,
  ].join("\n");
}

/** "ONP-001..009, TEC-001..008" rather than 17 codes. */
function summariseRules(codes: string[]): string {
  const byPrefix = new Map<string, number[]>();
  for (const code of codes) {
    const [p, n] = code.split("-");
    if (!p || !n) continue;
    byPrefix.set(p, [...(byPrefix.get(p) ?? []), Number(n)]);
  }
  return [...byPrefix.entries()]
    .map(([p, ns]) => {
      const sorted = ns.sort((a, b) => a - b);
      const lo = String(sorted[0]).padStart(3, "0");
      const hi = String(sorted[sorted.length - 1]).padStart(3, "0");
      return sorted.length === 1 ? `${p}-${lo}` : `${p}-${lo}..${hi}`;
    })
    .join(", ");
}

if (isEntryPoint(import.meta.url)) {
  const ctx = collect();
  const json = process.argv.includes("--json");
  process.stdout.write((json ? JSON.stringify(ctx, null, 2) : render(ctx)) + "\n");
}
