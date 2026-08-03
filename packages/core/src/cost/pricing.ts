/**
 * What each external call costs.
 *
 * One file, because the alternative is a price scattered across five call
 * sites and a budget guard that nobody trusts. These are **list prices**, and
 * list prices drift — when a real invoice arrives, correct the number here and
 * record it in STATUS.md's cost table. Everything downstream picks it up.
 *
 * A price that is wrong by a factor of two still enforces a useful ceiling.
 * A price of zero does not, which is why nothing here is zero except the APIs
 * that really are free.
 */

/** THB per USD. The one number that moves on its own, so it is overridable. */
export function usdToThb(): number {
  const raw = Number(process.env.USD_THB);
  return Number.isFinite(raw) && raw > 0 ? raw : 36;
}

const USD = {
  /** SERP: Google Organic, Live Advanced — priced per keyword. */
  dfsSerpLive: 0.002,
  /** Keywords Data: Google Ads search volume, Live — per request, ≤1000 terms. */
  dfsVolumeLive: 0.05,
  /** Places details, per call. Rank grid multiplies this by the grid size. */
  placesDetails: 0.017,
} as const;

/** Blended USD per 1K tokens. Cheap runs many times; smart runs once. */
const LLM_USD_PER_1K = { cheap: 0.0004, smart: 0.006 } as const;

export function thb(kind: keyof typeof USD, units = 1): number {
  return round4(USD[kind] * units * usdToThb());
}

export function llmThb(
  tier: keyof typeof LLM_USD_PER_1K,
  tokens: number,
): number {
  return round4((tokens / 1000) * LLM_USD_PER_1K[tier] * usdToThb());
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
