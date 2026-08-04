/**
 * Which formula to use.
 *
 * New runs get `CURRENT_SCORING_VERSION`. An old run keeps whatever version it
 * recorded, and `scorerFor` is how a report re-derives its numbers under the
 * formula that produced them — the whole reason there is no `scores` table.
 *
 * Adding a version means: write `v{n}.ts`, add one line to `SCORERS`, and bump
 * the constant. Never edit an existing version.
 */
import * as v1 from "./v1.ts";
import * as v2 from "./v2.ts";
import * as v3 from "./v3.ts";
import type { Scores, ScoringInput } from "./v1.ts";

export type { Scores, ScoringInput };

export interface Scorer {
  version: number;
  score(input: ScoringInput): Scores;
  scoreInputs(input: ScoringInput): Record<string, unknown>;
}

const SCORERS: Record<number, Scorer> = {
  1: { version: 1, score: v1.score, scoreInputs: v1.scoreInputs },
  2: { version: 2, score: v2.score, scoreInputs: v2.scoreInputs },
  3: { version: 3, score: v3.score, scoreInputs: v3.scoreInputs },
};

export const CURRENT_SCORING_VERSION = 3;

/**
 * The scorer for a version. An unknown version falls back to the current one
 * with the returned `version` still reporting what was asked for — a report
 * that cannot find its formula should say so, not silently show v1 numbers
 * labelled v7.
 */
export function scorerFor(version: number): Scorer {
  return SCORERS[version] ?? SCORERS[CURRENT_SCORING_VERSION]!;
}

export function currentScorer(): Scorer {
  return SCORERS[CURRENT_SCORING_VERSION]!;
}
