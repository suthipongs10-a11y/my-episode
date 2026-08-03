/**
 * The stage registry.
 *
 * Milestones add stages here and nowhere else, so this file is the honest
 * answer to "what does the pipeline actually do right now".
 */
import type { PipelineStage } from "./runner.ts";
import { intakeStage } from "./01-intake.ts";
import { discoverStage } from "./02-discover.ts";
import { crawlStage } from "./03-crawl.ts";
import { classifyStage } from "./04-classify.ts";
import { psiStage } from "./05-psi.ts";
import { rulesStage } from "./11-rules.ts";
import { scoringStage } from "./12-scoring.ts";

export const STAGE_REGISTRY: PipelineStage[] = [
  intakeStage,     // M1
  discoverStage,   // M1
  crawlStage,      // M1
  classifyStage,   // M1
  psiStage,        // M1 — skipped without PSI_API_KEY
  rulesStage,      // M1 (ONP, TEC) + M2 (CVR)
  scoringStage,    // M2
];

export * from "./runner.ts";
