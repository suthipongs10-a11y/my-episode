/**
 * Opportunity: how good a *lead* is this — the seller's number.
 *
 * Deliberately not the site score. The site score answers "how good is this
 * website" and is shown to its owner. This answers "should I spend an hour
 * writing a proposal to this business", is shown only to us, and is built
 * from a different question: not *is it bad*, but *is it bad in a way we can
 * sell a fix for, to somebody who is there and able to pay*.
 *
 * Nine signals, additive, the way the operator scores a lead by hand:
 *
 *   กำลังยิง Ads                  +25   pixels on the site, or seen in paid results
 *   Website มีปัญหา Conversion    +20   conversion findings, graded by severity
 *   Mobile มีปัญหา                +10   viewport, tap-to-call, sticky CTA, mobile speed
 *   SEO อ่อน                      +10   on-page score, rankings when checked, SEO findings
 *   ไม่มี Landing Page            +15   no service or area page for ads or search to land on
 *   GBP Active                     +5   Places — unmeasured until the key exists
 *   Facebook Active                +5   a page is linked; whether it posts is a click away
 *   มี Review จำนวนมาก             +5   Places, or the count the site states in JSON-LD
 *   มีหลายสาขา                     +5   Places, location pages, addresses, "N สาขา"
 *
 * A signal is `hit` (evidence found), `partial` (weaker evidence, fewer
 * points), `miss` (looked, found nothing) or `unmeasured` (could not look yet).
 * The score is points over the *measured* maximum: a run without Places is
 * scored out of 90 and says so, and a hatched row names what is missing —
 * a silent zero would read as "looked, found nothing", which is a different
 * and false claim.
 *
 * Two vetoes: an unreachable site is not a lead at any score, and a parked
 * domain is capped at 10 however the other rows read.
 *
 * Project rule #1 applies: every number is a deterministic function of the
 * facts. Nothing here asks a model anything. `pitch` picks *which story the
 * proposal should lead with* from those same facts, so whoever writes the
 * proposal — a person, or a model later — is told the angle, not asked for it.
 *
 * Version 2. Version 1 (pain / budget / alive / reach) was replaced before any
 * real run had used it; a snapshot without `version` is one of those.
 */
import type { Finding, Severity } from "../types/index.ts";
import type { PresenceResult } from "../pipeline/09-presence.ts";

export type SignalKey =
  | "ads" | "conversion" | "mobile" | "seo" | "landing"
  | "gbp" | "facebook" | "reviews" | "branches";

export type SignalStatus = "hit" | "partial" | "miss" | "unmeasured";

export interface Signal {
  key: SignalKey;
  max: number;
  points: number;
  status: SignalStatus;
  /** Why, in the operator's words. For an unmeasured row: what would measure it. */
  evidence: string[];
  /** Finding codes behind the points, so the dashboard can name them. */
  codes?: string[];
  /** Somewhere the operator can look by hand — the Facebook page, say. */
  link?: string;
}

/** The table, in the order the operator reads it. */
export const SIGNAL_ORDER: SignalKey[] = [
  "ads", "conversion", "mobile", "seo", "landing", "gbp", "facebook", "reviews", "branches",
];

export const SIGNAL_MAX: Record<SignalKey, number> = {
  ads: 25, conversion: 20, mobile: 10, seo: 10, landing: 15,
  gbp: 5, facebook: 5, reviews: 5, branches: 5,
};

export type Pitch = "ads_leak" | "cannot_be_contacted" | "invisible" | "fix_list" | "not_a_lead";

export interface Opportunity {
  version: 2;
  /** 0–100: points over the measured maximum, then vetoed. */
  score: number;
  points: number;
  measuredMax: number;
  /** measuredMax / 100 — how much of the table could be filled in. */
  coverage: number;
  signals: Signal[];
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
  /** Category scores from the site scorer, `overall` included. Null before scoring. */
  scores: Record<string, number> | null;
  /** Whether a vendor actually measured these; a placeholder 50 is not a measurement. */
  measured: { visibility: boolean; psi: boolean };
  findings: Finding[];
  presence: PresenceResult | null;
  /** The site's own pages that fetched, by classified type. */
  pages: { total: number; byType: Partial<Record<string, number>> };
  /** From the crawl: does the site expose a way to reach the business. */
  contact: { tel: boolean; line: boolean };
  /** Google Business Profile facts, once 08-gbp runs. Null until then. */
  gbp?: { active: boolean; reviewCount: number | null; locations: number | null } | null;
}

/** Findings that are about the phone in the customer's hand. */
export const MOBILE_RULES = new Set(["TEC-002", "TEC-003", "TEC-007", "CVR-001", "CVR-003"]);

/** Findings that keep Google from finding, reading or ranking the site. */
export const SEO_RULES = new Set([
  "ONP-001", "ONP-002", "ONP-003", "ONP-004", "ONP-005", "ONP-006", "ONP-007", "ONP-008", "ONP-009",
  "TEC-004", "TEC-005", "TEC-006", "CON-002", "CON-005", "CMP-001",
]);

/** "จำนวนมาก" starts here — enough that the business is clearly trading. */
export const MANY_REVIEWS = 20;

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
  const gbp = input.gbp ?? null;

  const signals: Signal[] = [
    adsSignal(p),
    conversionSignal(input.findings),
    mobileSignal(input.findings, input.measured.psi),
    seoSignal(input.findings, input.scores, input.measured.visibility),
    landingSignal(input.pages),
    gbpSignal(gbp),
    facebookSignal(p),
    reviewsSignal(gbp, p),
    branchesSignal(gbp, p),
  ];

  const points = signals.reduce((sum, s) => sum + s.points, 0);
  const measuredMax = signals
    .filter((s) => s.status !== "unmeasured")
    .reduce((sum, s) => sum + s.max, 0);
  let score = measuredMax > 0 ? Math.round((points / measuredMax) * 100) : 0;

  // -- vetoes -----------------------------------------------------------------
  const vetoes: string[] = [];
  if (p && !p.activity.reachable) {
    vetoes.push("เว็บเข้าไม่ได้ — ไม่มีอะไรให้เสนอ");
    score = 0;
  } else if (p?.activity.parked) {
    vetoes.push("โดเมนว่าง/หน้า placeholder — ไม่มีธุรกิจอยู่หลังเว็บนี้");
    score = Math.min(score, 10);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    version: 2,
    score,
    points,
    measuredMax,
    coverage: measuredMax / 100,
    signals,
    vetoes,
    quickWins: quickWins(input.findings),
    pitch: pickPitch({ signals, vetoes, score, contact: input.contact, presence: p, findings: input.findings }),
  };
}

// ---------------------------------------------------------------------------
// the nine rows
// ---------------------------------------------------------------------------
function adsSignal(p: PresenceResult | null): Signal {
  const key = "ads";
  if (!p) return unmeasured(key, "ยังไม่ได้ crawl เว็บ");

  const evidence: string[] = [];
  if (p.ads.googleSerp) {
    evidence.push(`เห็นโฆษณา Google ของเว็บนี้ในผลค้นหา ${p.ads.googleSerpTerms.length} คำ`);
  }
  const paid = p.ads.platforms.filter((x) => x !== "gtm" && x !== "ga4");
  if (paid.length) evidence.push(`มี pixel โฆษณาบนเว็บ: ${paid.join(", ")}`);

  if (p.ads.verdict === "yes") return row(key, SIGNAL_MAX.ads, "hit", evidence);
  if (p.ads.verdict === "maybe") {
    return row(key, 10, "partial", ["มี Google Tag Manager — อาจมี tag โฆษณาอยู่ข้างใน แต่เห็นแค่ container"]);
  }
  return row(key, 0, "miss", ["ไม่พบ pixel โฆษณาบนเว็บ"]);
}

function conversionSignal(findings: Finding[]): Signal {
  const key = "conversion";
  const hits = findings.filter((f) => f.category === "conversion");
  if (hits.length === 0) return row(key, 0, "miss", ["ไม่พบปัญหา conversion"]);

  const worst = worstOf(hits);
  const points = worst === "critical" ? SIGNAL_MAX.conversion : worst === "high" ? 15
    : worst === "medium" ? 10 : 5;
  return {
    ...row(key, points, points >= 15 ? "hit" : "partial", [`${hits.length} เรื่อง — ${tallyText(hits)}`]),
    codes: codesOf(hits),
  };
}

function mobileSignal(findings: Finding[], psiMeasured: boolean): Signal {
  const key = "mobile";
  const hits = findings.filter((f) => MOBILE_RULES.has(f.code));
  const note = psiMeasured ? [] : ["ยังไม่ได้วัดความเร็วบนมือถือ (ต้องมี PSI key)"];
  if (hits.length === 0) return row(key, 0, "miss", ["ไม่พบปัญหาบนมือถือ", ...note]);

  const worst = worstOf(hits);
  const points = worst === "critical" || worst === "high" ? SIGNAL_MAX.mobile : 5;
  return {
    ...row(key, points, points === SIGNAL_MAX.mobile ? "hit" : "partial",
      [`${hits.length} เรื่อง — ${tallyText(hits)}`, ...note]),
    codes: codesOf(hits),
  };
}

function seoSignal(
  findings: Finding[], scores: Record<string, number> | null, visibilityMeasured: boolean,
): Signal {
  const key = "seo";
  const hits = findings.filter((f) => SEO_RULES.has(f.code));
  const onpage = scores?.onpage ?? null;
  const visibility = visibilityMeasured ? scores?.visibility ?? null : null;

  const evidence: string[] = [];
  if (onpage !== null) evidence.push(`โครงสร้างหน้าเว็บ ${onpage}/100`);
  evidence.push(visibility !== null
    ? `อันดับใน Google ${visibility}/100`
    : "ยังไม่ได้เช็คอันดับ (ต้องต่อ DataForSEO)");
  if (hits.length) evidence.push(`ปัญหา SEO ${hits.length} เรื่อง — ${tallyText(hits)}`);

  const seriousHits = hits.filter((f) => RANK[f.severity] >= RANK.high).length;
  const weak = (onpage !== null && onpage < 50) || (visibility !== null && visibility < 40)
    || seriousHits >= 2;
  const soft = hits.length > 0 || (onpage !== null && onpage < 70);

  const points = weak ? SIGNAL_MAX.seo : soft ? 5 : 0;
  return {
    ...row(key, points, weak ? "hit" : soft ? "partial" : "miss", evidence),
    codes: codesOf(hits),
  };
}

function landingSignal(pages: OpportunityInput["pages"]): Signal {
  const key = "landing";
  if (pages.total === 0) return unmeasured(key, "ไม่มีหน้าที่ crawl ได้");

  const service = (pages.byType.service ?? 0) + (pages.byType.location ?? 0);
  const mix = Object.entries(pages.byType).map(([t, n]) => `${t} ${n}`).join(", ");

  if (pages.total === 1) {
    return row(key, SIGNAL_MAX.landing, "hit", ["เว็บมีหน้าเดียว — ไม่มีหน้าให้โฆษณาหรือคำค้นเฉพาะลงจอด"]);
  }
  if (service === 0) {
    return row(key, SIGNAL_MAX.landing, "hit", [`ไม่มีหน้าบริการหรือหน้าพื้นที่เลย (${pages.total} หน้า: ${mix})`]);
  }
  if (service === 1) return row(key, 8, "partial", [`มีหน้าบริการแค่ 1 หน้า จากทั้งหมด ${pages.total} หน้า`]);
  return row(key, 0, "miss", [`มีหน้าบริการ/พื้นที่ ${service} หน้า`]);
}

function gbpSignal(gbp: OpportunityInput["gbp"]): Signal {
  const key = "gbp";
  if (!gbp) return unmeasured(key, "ต้องต่อ Google Places ก่อน");
  return gbp.active
    ? row(key, SIGNAL_MAX.gbp, "hit", ["Google Business Profile เปิดอยู่"])
    : row(key, 0, "miss", ["ไม่พบ Google Business Profile หรือปิดอยู่"]);
}

function facebookSignal(p: PresenceResult | null): Signal {
  const key = "facebook";
  if (!p) return unmeasured(key, "ยังไม่ได้ crawl เว็บ");
  const url = p.social.facebook;
  if (!url) return row(key, 0, "miss", ["ไม่พบลิงก์ Facebook บนเว็บ"]);
  // Whether the page still posts is one click for a person and a login wall
  // for a crawler. The link is the evidence; the click is the operator's.
  return { ...row(key, SIGNAL_MAX.facebook, "hit", ["มีเพจ Facebook — กดดูว่ายังโพสต์อยู่ไหม"]), link: url };
}

function reviewsSignal(gbp: OpportunityInput["gbp"], p: PresenceResult | null): Signal {
  const key = "reviews";
  const fromGoogle = gbp?.reviewCount ?? null;
  const fromSite = p?.business?.reviewCount ?? null;
  const n = fromGoogle ?? fromSite;
  if (n === null) return unmeasured(key, "ต้องต่อ Google Places ก่อน — เว็บไม่ได้บอกจำนวนรีวิวไว้");

  const source = fromGoogle !== null ? "Google" : "schema บนเว็บ";
  return n >= MANY_REVIEWS
    ? row(key, SIGNAL_MAX.reviews, "hit", [`รีวิว ${n} รายการ (${source})`])
    : row(key, 0, "miss", [`รีวิว ${n} รายการ (${source}) — ยังไม่ถึง ${MANY_REVIEWS}`]);
}

function branchesSignal(gbp: OpportunityInput["gbp"], p: PresenceResult | null): Signal {
  const key = "branches";
  if (!p) return unmeasured(key, "ยังไม่ได้ crawl เว็บ");
  const b = p.business ?? { addresses: 0, locationPages: 0, branchMentions: 0, reviewCount: null };

  const evidence: string[] = [];
  if ((gbp?.locations ?? 0) >= 2) evidence.push(`Google รู้จัก ${gbp!.locations} สาขา`);
  if (b.locationPages >= 2) evidence.push(`มีหน้าพื้นที่/สาขา ${b.locationPages} หน้า`);
  if (b.addresses >= 2) evidence.push(`ที่อยู่ใน schema ${b.addresses} แห่ง`);
  if (b.branchMentions >= 2) evidence.push(`เว็บบอกว่ามี ${b.branchMentions} สาขา`);

  return evidence.length
    ? row(key, SIGNAL_MAX.branches, "hit", evidence)
    : row(key, 0, "miss", ["ไม่พบสัญญาณว่ามีหลายสาขา"]);
}

// ---------------------------------------------------------------------------
// pitch
// ---------------------------------------------------------------------------
/**
 * Which story the proposal leads with. One angle, chosen from facts, so the
 * writer (human or model) is told what to say rather than asked to decide.
 */
function pickPitch(x: {
  signals: Signal[]; vetoes: string[]; score: number;
  contact: OpportunityInput["contact"]; presence: PresenceResult | null; findings: Finding[];
}): Pitch {
  if (x.vetoes.length) return "not_a_lead";
  const s = Object.fromEntries(x.signals.map((sig) => [sig.key, sig])) as Record<SignalKey, Signal>;

  if (s.ads.status === "hit" && (s.conversion.points >= 15 || s.landing.status === "hit")) {
    return "ads_leak";
  }
  if (!x.contact.tel && !x.contact.line && !x.presence?.social.facebook) return "cannot_be_contacted";
  if (s.seo.status === "hit" && s.ads.status !== "hit") return "invisible";
  if (x.findings.length === 0 && x.score < 20) return "not_a_lead";
  return "fix_list";
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const RANK: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const SEVERITY_TH: Record<Severity, string> = { critical: "วิกฤต", high: "สูง", medium: "กลาง", low: "ต่ำ" };

function row(key: SignalKey, points: number, status: SignalStatus, evidence: string[]): Signal {
  return { key, max: SIGNAL_MAX[key], points, status, evidence };
}

function unmeasured(key: SignalKey, why: string): Signal {
  return { key, max: SIGNAL_MAX[key], points: 0, status: "unmeasured", evidence: [why] };
}

function worstOf(findings: Finding[]): Severity {
  return findings.reduce<Severity>(
    (worst, f) => (RANK[f.severity] > RANK[worst] ? f.severity : worst), "low");
}

/** "วิกฤต 2 · สูง 1", worst first, zero counts left out. */
function tallyText(findings: Finding[]): string {
  const counts = new Map<Severity, number>();
  for (const f of findings) counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1);
  return (["critical", "high", "medium", "low"] as Severity[])
    .filter((sev) => counts.has(sev))
    .map((sev) => `${SEVERITY_TH[sev]} ${counts.get(sev)}`)
    .join(" · ");
}

function codesOf(findings: Finding[]): string[] {
  return [...findings]
    .sort((a, b) => RANK[b.severity] - RANK[a.severity] || a.code.localeCompare(b.code))
    .map((f) => f.code);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
