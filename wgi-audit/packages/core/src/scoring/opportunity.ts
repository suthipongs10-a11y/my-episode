/**
 * Opportunity: how good a *lead* is this — the seller's number.
 *
 * Deliberately not the site score. The site score answers "how good is this
 * website" and is shown to its owner. This answers "should I spend an hour
 * writing a proposal to this business", is shown only to us, and is built
 * from a different question: not *is it bad*, but *is it bad in a way we can
 * sell a fix for, to somebody who is there and able to pay*.
 *
 * Four components, each with its evidence attached, and two vetoes:
 *
 *   pain    0–40  how much is wrong, weighted toward things we fix (conversion)
 *   budget  0–25  are they already paying for traffic — pixels, paid SERP
 *   alive   0–20  reachable, not parked, footer not from 2019, active elsewhere
 *   reach   0–15  can we actually contact them — phone, LINE, Facebook
 *
 *   veto    parked or unreachable → there is no business here to sell to
 *
 * Project rule #1 applies: every number is a deterministic function of the
 * facts. Nothing here asks a model anything. `pitch` picks *which story the
 * proposal should lead with* from those same facts, so when the model writes
 * the proposal later it is told the angle rather than guessing it.
 */
import type { Finding } from "../types/index.ts";
import type { PresenceResult } from "../pipeline/09-presence.ts";

export interface Component {
  value: number;
  max: number;
  evidence: string[];
}

export type Pitch = "ads_leak" | "cannot_be_contacted" | "invisible" | "fix_list" | "not_a_lead";

export interface Opportunity {
  score: number;
  components: { pain: Component; budget: Component; alive: Component; reach: Component };
  vetoes: string[];
  quickWins: QuickWin[];
  pitch: Pitch;
}

export interface QuickWin {
  code: string;
  impactScore: number;
  effortHours: number;
  /** impact per hour — the sort key, and the number a proposal can quote. */
  leverage: number;
}

export interface OpportunityInput {
  /** The client-facing overall score, 0–100, already renormalised (v3). */
  overall: number | null;
  findings: Finding[];
  presence: PresenceResult | null;
  /** From the crawl: does the site expose a way to reach the business. */
  contact: { tel: boolean; line: boolean };
}

/** A finding worth doing this week: high impact, small effort. */
export const QUICK_WIN_MIN_IMPACT = 6;
export const QUICK_WIN_MAX_HOURS = 3;

export function quickWins(findings: Finding[], limit = 5): QuickWin[] {
  return findings
    .filter((f) => (f.impactScore ?? 0) >= QUICK_WIN_MIN_IMPACT
                && (f.effortHours ?? Infinity) <= QUICK_WIN_MAX_HOURS)
    .map((f) => ({
      code: f.code,
      impactScore: f.impactScore ?? 0,
      effortHours: f.effortHours ?? 0,
      leverage: round1((f.impactScore ?? 0) / Math.max(f.effortHours ?? 0.5, 0.5)),
    }))
    .sort((a, b) => b.leverage - a.leverage || a.code.localeCompare(b.code))
    .slice(0, limit);
}

export function scoreOpportunity(input: OpportunityInput): Opportunity {
  const p = input.presence;
  const wins = quickWins(input.findings);

  // -- pain -------------------------------------------------------------------
  const pain: Component = { value: 0, max: 40, evidence: [] };
  if (input.overall !== null) {
    // Worse site, more to fix. 100 → 0 pain; 0 → 30 pain.
    pain.value += (100 - input.overall) * 0.3;
    pain.evidence.push(`คะแนนเว็บ ${input.overall}/100`);
  }
  const critical = input.findings.filter((f) => f.severity === "critical").length;
  const conversion = input.findings.filter((f) => f.category === "conversion").length;
  if (critical > 0) {
    pain.value += Math.min(6, critical * 2);
    pain.evidence.push(`วิกฤต ${critical} เรื่อง`);
  }
  if (conversion > 0) {
    // Conversion problems are the ones we sell fixes for, and the cheapest to show value on.
    pain.value += Math.min(4, conversion);
    pain.evidence.push(`ปัญหา conversion ${conversion} เรื่อง`);
  }

  // -- budget -----------------------------------------------------------------
  const budget: Component = { value: 0, max: 25, evidence: [] };
  if (p) {
    if (p.ads.googleSerp) {
      budget.value += 15;
      budget.evidence.push(`ซื้อ Google Ads อยู่ (เห็นในผลค้นหา ${p.ads.googleSerpTerms.length} คำ)`);
    }
    const paid = p.ads.platforms.filter((x) => x !== "gtm" && x !== "ga4");
    if (paid.length > 0) {
      budget.value += Math.min(15, 10 + (paid.length - 1) * 5);
      budget.evidence.push(`มี pixel โฆษณาบนเว็บ: ${paid.join(", ")}`);
    } else if (p.ads.verdict === "maybe") {
      budget.value += 4;
      budget.evidence.push("มี Google Tag Manager — อาจมี tag โฆษณาอยู่ข้างใน");
    }
    budget.value = Math.min(budget.max, budget.value);
  }

  // -- alive ------------------------------------------------------------------
  const alive: Component = { value: 0, max: 20, evidence: [] };
  if (p) {
    if (p.activity.reachable) { alive.value += 8; alive.evidence.push("เว็บออนไลน์"); }
    if (p.activity.yearsStale !== null) {
      const fresh = p.activity.yearsStale <= 1 ? 6 : p.activity.yearsStale <= 3 ? 3 : 0;
      alive.value += fresh;
      alive.evidence.push(`ปีลิขสิทธิ์ท้ายเว็บ ${p.activity.copyrightYear}`);
    } else {
      alive.value += 3; // unknown is not stale
    }
    const socials = Object.keys(p.social);
    if (socials.length > 0) {
      alive.value += Math.min(6, socials.length * 3);
      alive.evidence.push(`มีช่องทางอื่น: ${socials.join(", ")}`);
    }
  }

  // -- reach ------------------------------------------------------------------
  const reach: Component = { value: 0, max: 15, evidence: [] };
  if (input.contact.tel)  { reach.value += 6; reach.evidence.push("มีเบอร์โทรบนเว็บ"); }
  if (input.contact.line) { reach.value += 6; reach.evidence.push("มี LINE บนเว็บ"); }
  if (p?.social.facebook) { reach.value += 3; reach.evidence.push("มี Facebook page"); }
  reach.value = Math.min(reach.max, reach.value);

  // -- vetoes -----------------------------------------------------------------
  const vetoes: string[] = [];
  let score = pain.value + budget.value + alive.value + reach.value;
  if (p && !p.activity.reachable) {
    vetoes.push("เว็บเข้าไม่ได้ — ไม่มีอะไรให้เสนอ");
    score = 0;
  } else if (p?.activity.parked) {
    vetoes.push("โดเมนว่าง/หน้า placeholder — ไม่มีธุรกิจอยู่หลังเว็บนี้");
    score = Math.min(score, 10);
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    components: {
      pain: rounded(pain), budget: rounded(budget), alive: rounded(alive), reach: rounded(reach),
    },
    vetoes,
    quickWins: wins,
    pitch: pickPitch({ vetoes, budget, reach, overall: input.overall, findings: input.findings }),
  };
}

/**
 * Which story the proposal leads with. One angle, chosen from facts, so the
 * writer (human or model) is told what to say rather than asked to decide.
 */
function pickPitch(x: {
  vetoes: string[]; budget: Component; reach: Component;
  overall: number | null; findings: Finding[];
}): Pitch {
  if (x.vetoes.length) return "not_a_lead";
  const conversionCritical = x.findings.some(
    (f) => f.category === "conversion" && f.severity === "critical");
  if (x.budget.value >= 10 && conversionCritical) return "ads_leak";
  if (x.reach.value === 0) return "cannot_be_contacted";
  if (x.findings.some((f) => f.code === "CON-002" || f.code === "TEC-005")) return "invisible";
  return "fix_list";
}

function rounded(c: Component): Component {
  return { ...c, value: round1(c.value) };
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
