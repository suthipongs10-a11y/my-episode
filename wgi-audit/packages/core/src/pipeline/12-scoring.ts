/**
 * 12 — Scoring.
 *
 * Computes the six category scores from raw facts and stores them as a
 * snapshot — not as a `scores` table. The snapshot records which formula
 * version produced it, so an old report stays explainable after the formula
 * changes.
 *
 * The version used is the one on the run, not the newest one. A resumed or
 * re-scored run must not silently change formula halfway through.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { scorerFor, type ScoringInput } from "../scoring/index.ts";
import type { SiteFacts } from "../rules/index.ts";
import { buildFacts } from "./11-rules.ts";
import { TOP_N } from "../rules/competitor.ts";
import { scoreOpportunity } from "../scoring/opportunity.ts";
import type { PresenceResult } from "./09-presence.ts";
import { fetchedPages } from "../rules/context.ts";

/** Top 3 is where the clicks are; the split matters to the formula. */
const TOP_3 = 3;

export const scoringStage: PipelineStage = {
  name: "12-scoring",
  async run(ctx: StageContext) {
    const facts = (ctx.state.get("facts") as SiteFacts | undefined) ?? buildFacts(ctx);
    const input = withM3Inputs(facts);
    const scorer = scorerFor(ctx.run.scoring_version);
    const scores = scorer.score(input);

    ctx.state.set("scores", scores);
    await saveSnapshot(ctx.db, ctx.run.id, "site", "scores", {
      scoring_version: scorer.version,
      scores,
      inputs: scorer.scoreInputs(input),
    });
    ctx.log.info("scored", { version: scorer.version, ...scores });

    // The seller's number, kept in its own snapshot: it must never leak into
    // the client-facing report, and it changes for different reasons.
    const pages = fetchedPages(facts);
    const opportunity = scoreOpportunity({
      overall: scores.overall,
      findings: (ctx.state.get("findings") as import("../types/index.ts").Finding[] | undefined) ?? [],
      presence: (ctx.state.get("presence") as PresenceResult | undefined) ?? null,
      contact: {
        tel: pages.some((p) => p.hasTelLink),
        line: pages.some((p) => p.hasLineLink),
      },
    });
    ctx.state.set("opportunity", opportunity);
    await saveSnapshot(ctx.db, ctx.run.id, "site", "opportunity", opportunity);
    ctx.log.info("opportunity", {
      score: opportunity.score, pitch: opportunity.pitch,
      quickWins: opportunity.quickWins.length, vetoes: opportunity.vetoes.length,
    });
  },
};

/**
 * Reshape M3's facts into what the scoring formulas take.
 *
 * `visibility` stays **undefined** when no keyword was checked rather than
 * becoming `{ keywordsChecked: 0 }`. The distinction is the whole point of
 * scoring v2: a site nobody measured must not be scored as a site that ranks
 * for nothing.
 */
export function withM3Inputs(facts: SiteFacts): ScoringInput {
  const input = facts as ScoringInput;

  // `checked`, not `position !== null`. A site we searched thirty terms for and
  // found nowhere has a visibility of 0, and that is a real, useful result —
  // it is only a site nobody searched for that must not be scored at all.
  const checked = (facts.keywords ?? []).filter((k) => k.checked);
  if (checked.length > 0) {
    input.visibility = {
      keywordsChecked: checked.length,
      inTop10: checked.filter((k) => k.position !== null && k.position <= TOP_N).length,
      inTop3: checked.filter((k) => k.position !== null && k.position <= TOP_3).length,
    };
  }

  const measured = (facts.competitors ?? []).filter((c) => !c.notMeasured);
  if (measured.length > 0) {
    input.competitorPageCounts = {
      servicePages: measured.map((c) => (c.counts.service ?? 0) + (c.counts.location ?? 0)),
      articles: measured.map((c) => c.counts.article ?? 0),
    };
  }

  return input;
}
