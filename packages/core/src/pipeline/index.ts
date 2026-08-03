/**
 * The stage registry.
 *
 * Milestones add stages here and nowhere else, so this file is the honest
 * answer to "what does the pipeline actually do right now".
 *
 * M0 registers nothing on purpose: the milestone's acceptance is that the
 * plumbing works end to end — CLI creates a run, the worker claims the job,
 * the run reaches `done` — with no stage doing real work yet. M1 adds
 * 01-intake through 05-psi.
 */
import type { PipelineStage } from "./runner.ts";

export const STAGE_REGISTRY: PipelineStage[] = [];

export * from "./runner.ts";
