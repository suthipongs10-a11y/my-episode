/**
 * The rules engine.
 *
 * One entry point: facts in, findings out, sorted so the report writes itself
 * in the right order. Nothing here reaches the network or an LLM.
 */
import type { Finding } from "../types/index.ts";
import { SEVERITY_RANK, meta } from "./catalog.ts";
import type { FindingCode } from "../i18n/th.ts";
import type { SiteFacts } from "./context.ts";
import { runOnpage } from "./onpage.ts";
import { runTechnical } from "./technical.ts";
import { runConversion } from "./conversion.ts";

export * from "./context.ts";
export * from "./catalog.ts";
export { conversionChecks } from "./conversion.ts";

export function runRules(facts: SiteFacts): Finding[] {
  const findings = [
    ...runTechnical(facts),
    ...runOnpage(facts),
    ...runConversion(facts),
  ];
  return prioritise(findings);
}

/**
 * Order for the report: worst first, and within a severity, the one that buys
 * the most improvement per hour of work. An owner reads the top three and
 * stops, so the ordering is most of what the report is for.
 */
export function prioritise(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;

    const aRatio = ratio(a);
    const bRatio = ratio(b);
    if (bRatio !== aRatio) return bRatio - aRatio;

    return a.code.localeCompare(b.code); // stable, so runs are reproducible
  });
}

function ratio(f: Finding): number {
  const m = meta(f.code as FindingCode);
  return m.impact / Math.max(m.effortHours, 0.5);
}
