/**
 * 12 — Scoring.
 *
 * Computes the six category scores from raw facts and stores them as a
 * snapshot — not as a `scores` table. The snapshot records which formula
 * version produced it, so an old report stays explainable after the formula
 * changes.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { SCORING_VERSION, score, scoreInputs, type ScoringInput } from "../scoring/v1.ts";
import type { SiteFacts } from "../rules/index.ts";
import { buildFacts } from "./11-rules.ts";

export const scoringStage: PipelineStage = {
  name: "12-scoring",
  async run(ctx: StageContext) {
    const facts = (ctx.state.get("facts") as SiteFacts | undefined) ?? buildFacts(ctx);
    const input = facts as ScoringInput;
    const scores = score(input);

    ctx.state.set("scores", scores);
    await saveSnapshot(ctx.db, ctx.run.id, "site", "scores", {
      scoring_version: SCORING_VERSION,
      scores,
      inputs: scoreInputs(input),
    });
    ctx.log.info("scored", { ...scores });
  },
};
