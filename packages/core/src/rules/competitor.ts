/**
 * CMP — Competitor. What a named rival is doing that this site is not.
 *
 * All three stay silent without the data behind them. A competitor section that
 * reads "no competitors are beating you" because DataForSEO was never called
 * would be the most damaging sentence in the whole report: it is the one an
 * owner would quote back when they decide not to hire anyone.
 */
import type { Finding } from "../types/index.ts";
import {
  finding, measuredCompetitors, servicePages, type Rule, type SiteFacts,
} from "./context.ts";
import { normalise } from "../keywords/seed.ts";

/** "Top 10" is page one, which is the only page most people look at. */
export const TOP_N = 10;
/** Fewer losses than this is a normal spread, not a pattern worth a finding. */
export const MIN_LOSSES = 5;

/**
 * CMP-001 — one rival is on page one for terms this site is not.
 *
 * Counted per rival rather than in aggregate. "Five different companies each
 * beat you once" is the ordinary state of a search result; "this one company
 * beats you on eleven of your own keywords" is a competitor, and naming them is
 * what makes the report land.
 */
export const cmp001: Rule = (facts) => {
  const keywords = facts.keywords ?? [];
  if (keywords.length === 0) return [];

  const losses = new Map<string, { term: string; theirPosition: number; mine: number | null }[]>();

  for (const k of keywords) {
    const weAreOnPageOne = k.position !== null && k.position <= TOP_N;
    if (weAreOnPageOne) continue;

    for (const rival of k.ahead) {
      if (rival.position > TOP_N) continue;
      const list = losses.get(rival.domain) ?? [];
      list.push({ term: k.term, theirPosition: rival.position, mine: k.position });
      losses.set(rival.domain, list);
    }
  }

  return [...losses.entries()]
    .filter(([, terms]) => terms.length >= MIN_LOSSES)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([domain, terms]) =>
      finding("CMP-001", {
        competitor: domain,
        keywords_lost: terms.length,
        keywords_checked: keywords.length,
        examples: terms
          .sort((a, b) => a.theirPosition - b.theirPosition)
          .slice(0, 5),
      }),
    );
};

/**
 * CMP-002 — rivals sell something this site does not have a page for.
 *
 * Compares page *titles*, which is the closest thing to "what do you offer"
 * that a crawl can see. A title only counts as missing when at least two rivals
 * have it: one competitor's niche is not a gap, two competitors' is a market.
 */
export const cmp002: Rule = (facts) => {
  const rivals = measuredCompetitors(facts);
  if (rivals.length < 2) return [];

  const mine = servicePages(facts).map((p) => normalise(`${p.title ?? ""} ${p.h1.join(" ")}`));
  if (mine.length === 0) return []; // CON-001 covers "no service pages at all"

  const byTitle = new Map<string, Set<string>>();
  for (const rival of rivals) {
    for (const title of rival.serviceTitles) {
      const key = normalise(title);
      if (key.length < 4) continue;
      if (mine.some((m) => m.includes(key) || key.includes(m))) continue;
      const holders = byTitle.get(key) ?? new Set<string>();
      holders.add(rival.domain);
      byTitle.set(key, holders);
    }
  }

  const shared = [...byTitle.entries()]
    .filter(([, holders]) => holders.size >= 2)
    .map(([title, holders]) => ({ title, competitors: [...holders] }))
    .sort((a, b) => b.competitors.length - a.competitors.length)
    .slice(0, 10);

  if (shared.length === 0) return [];

  return [
    finding("CMP-002", {
      missing_services: shared,
      my_service_pages: mine.length,
      competitors_compared: rivals.map((c) => c.domain),
    }),
  ];
};

/**
 * CMP-003 — rivals are paying for the terms this site is not winning for free.
 *
 * Someone spending money on a keyword every month has decided it converts. That
 * is a stronger signal than any volume estimate, and it is free to observe.
 * Only counts terms where the client is not already on page one — a site
 * ranking first does not need to hear that somebody else is bidding.
 */
export const cmp003: Rule = (facts) => {
  const keywords = facts.keywords ?? [];
  if (keywords.length === 0) return [];

  const own = facts.domain.toLowerCase().replace(/^www\./, "");
  const contested = keywords.filter(
    (k) =>
      k.paidDomains.length > 0 &&
      !k.paidDomains.some((d) => d === own) &&
      (k.position === null || k.position > TOP_N),
  );
  if (contested.length === 0) return [];

  const advertisers = new Map<string, number>();
  for (const k of contested) {
    for (const d of k.paidDomains) advertisers.set(d, (advertisers.get(d) ?? 0) + 1);
  }

  return [
    finding("CMP-003", {
      keywords_with_competitor_ads: contested.length,
      keywords_checked: keywords.length,
      advertisers: [...advertisers.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, keywords: count })),
      examples: contested
        .slice(0, 5)
        .map((k) => ({ term: k.term, my_position: k.position, volume: k.volume })),
    }),
  ];
};

export const competitorRules: Rule[] = [cmp001, cmp002, cmp003];

export function runCompetitor(facts: SiteFacts): Finding[] {
  return competitorRules.flatMap((r) => r(facts));
}
