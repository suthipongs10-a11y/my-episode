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
import { keywordsStage } from "./06-keywords.ts";
import { serpStage } from "./07-serp.ts";
import { presenceStage } from "./09-presence.ts";
import { competitorsStage } from "./10-competitors.ts";
import { rulesStage } from "./11-rules.ts";
import { scoringStage } from "./12-scoring.ts";

export const STAGE_REGISTRY: PipelineStage[] = [
  intakeStage,      // M1
  discoverStage,    // M1
  crawlStage,       // M1
  classifyStage,    // M1 (rules) + M3 (cheap LLM for the leftovers)
  psiStage,         // M1 — skipped without PSI_API_KEY
  keywordsStage,    // M3 — seeds from code always; LLM and volume are optional
  serpStage,        // M3 — skipped without DataForSEO credentials
  presenceStage,    // pivot — ads, social, alive? (free signals; Places joins in M4)
  competitorsStage, // M3 — needs 07 to have found somebody
  rulesStage,       // M1 (ONP, TEC) + M2 (CVR) + M3 (CON, CMP)
  scoringStage,     // M2
];

export * from "./runner.ts";
