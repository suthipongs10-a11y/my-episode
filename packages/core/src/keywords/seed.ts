/**
 * Keyword seeds, derived from the site itself.
 *
 * A pure function on purpose. The model in 06-keywords proposes *additional*
 * terms, but the base list has to exist without it — an audit must still be
 * worth reading when `LLM_BASE_URL` is unset, and a deterministic seed list is
 * also what makes the stage testable at all.
 *
 * The source is what the business already says it sells: the titles and H1s of
 * its own service and location pages. That biases towards terms the site can
 * plausibly rank for, and it means CON-005 ("a buying keyword with no page
 * behind it") compares like with like.
 *
 * ## Thai
 *
 * Thai does not put spaces between words, so nothing here tries to split a
 * phrase into words. Everything operates on whole clauses cut at the
 * punctuation Thai pages actually use — `|`, `–`, `:` and friends — which is
 * both safer and closer to what people type into Google.
 */
import type { ExtractedPage } from "../crawl/extract.ts";

export type Intent = "transactional" | "informational" | "navigational";

export interface SeedKeyword {
  term: string;
  /** The area this term targets, when it is an area-specific variant. */
  area: string | null;
  intent: Intent;
}

export interface SeedInput {
  pages: ExtractedPage[];
  areas: string[];
  businessType?: string | null;
  domain?: string;
  /** Stop here. 06-keywords trims to 30 after real volume comes back. */
  limit?: number;
}

export const SEED_LIMIT = 60;

/** Words that mark a query as ready-to-buy rather than ready-to-read. */
const BUYING = [
  "ราคา", "รับ", "บริการ", "จ้าง", "ซื้อ", "ขาย", "ใกล้ฉัน", "เบอร์",
  "ร้าน", "ช่าง", "ติดตั้ง", "ซ่อม", "ถูก", "ด่วน", "ต่อ",
  "price", "hire", "book", "near me", "service",
];

const RESEARCH = [
  "วิธี", "ทำไม", "อย่างไร", "ยังไง", "คือ", "แนะนำ", "เปรียบเทียบ",
  "รีวิว", "ข้อดี", "ข้อเสีย", "ต่างกัน", "how to", "what is", "guide",
];

/** Titles that describe the site rather than a thing it sells. */
const BOILERPLATE = [
  "หน้าแรก", "หน้าหลัก", "เกี่ยวกับเรา", "ติดต่อเรา", "ติดต่อ", "บทความ",
  "ข่าวสาร", "แกลเลอรี", "ผลงาน", "คำถามที่พบบ่อย", "นโยบายความเป็นส่วนตัว",
  "เงื่อนไขการใช้งาน", "แผนผังเว็บไซต์",
  "home", "about", "about us", "contact", "contact us", "blog", "news",
  "gallery", "portfolio", "faq", "privacy policy", "terms", "sitemap",
];

export function seedKeywords(input: SeedInput): SeedKeyword[] {
  const limit = input.limit ?? SEED_LIMIT;
  const areas = input.areas.filter((a) => a.trim()).map((a) => a.trim());
  const brand = brandTokens(input);

  // 1. Base phrases: what the site's own service pages are called.
  const bases = new Set<string>();
  for (const page of input.pages) {
    if (page.isCompetitor) continue;
    if (page.pageType !== "service" && page.pageType !== "location") continue;
    for (const raw of [page.title ?? "", ...page.h1]) {
      const phrase = cleanPhrase(raw, brand, areas);
      if (phrase) bases.add(phrase);
    }
  }

  // A site with no recognisable service pages still gets a usable list from
  // what it says it is — the case for the one-page sites this product targets.
  const type = input.businessType?.trim();
  if (type) bases.add(type);

  // 2. Bare phrase, then one variant per area. Area variants are what a local
  //    business can realistically win, so they come first in the output.
  const out: SeedKeyword[] = [];
  const seen = new Set<string>();
  const push = (term: string, area: string | null) => {
    const key = normalise(term);
    if (!key || seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push({ term: term.trim(), area, intent: classifyIntent(term, brand) });
  };

  for (const base of bases) {
    for (const area of areas) push(`${base} ${area}`, area);
  }
  for (const base of bases) push(base, null);

  return out;
}

/**
 * Reduce a page title to the thing being sold.
 *
 * Titles are `<service> | <brand>` far more often than not, so the tail after a
 * separator is dropped, then the brand and the area names — the area is added
 * back as an explicit variant, and leaving it in would produce "ทำความสะอาด
 * ภูเก็ต ภูเก็ต".
 */
export function cleanPhrase(raw: string, brand: string[], areas: string[]): string | null {
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Keep the longest segment, not blindly the first: some sites lead with the
  // brand ("Phuket Maid | รับทำความสะอาดบ้าน").
  const segments = text.split(/\s*[|｜–—>»·:：]\s*|\s+-\s+/).filter((s) => s.trim());
  text = segments.sort((a, b) => b.trim().length - a.trim().length)[0]?.trim() ?? text;

  for (const b of brand) if (b.length >= 3) text = stripAll(text, b);
  for (const a of areas) text = stripAll(text, a);

  text = text.replace(/[\s,.·\-–—|]+$/u, "").replace(/^[\s,.·\-–—|]+/u, "").trim();

  if (!text || text.length < 3) return null;
  if (BOILERPLATE.includes(normalise(text))) return null;
  // A whole sentence is a heading, not a search query.
  if (charLength(text) > 60) return null;
  return text;
}

export function classifyIntent(term: string, brand: string[] = []): Intent {
  const t = normalise(term);
  if (brand.some((b) => b.length >= 4 && t.includes(normalise(b)))) return "navigational";
  if (RESEARCH.some((w) => t.includes(w))) return "informational";
  if (BUYING.some((w) => t.includes(w))) return "transactional";
  // A bare "<service> <area>" with no question words is somebody looking to
  // hire, which is the query this whole product is about.
  return "transactional";
}

/** Brand words to strip: the domain's own label, plus the site name if given. */
function brandTokens(input: SeedInput): string[] {
  const out: string[] = [];
  const label = (input.domain ?? "").split(".")[0];
  if (label) {
    out.push(label);
    // "phuketmaidservice" is one token to a machine but several to a reader;
    // a hyphenated or camelCased domain gives them up for free.
    out.push(...label.split(/[-_]/).filter((p) => p.length >= 3));
  }
  return [...new Set(out.filter(Boolean))];
}

function stripAll(text: string, needle: string): string {
  if (!needle) return text;
  const re = new RegExp(escapeRe(needle), "gi");
  return text.replace(re, " ").replace(/\s+/g, " ");
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Thai has no spaces, so "how long is this" means characters, not words. */
function charLength(s: string): number {
  return [...s].length;
}
