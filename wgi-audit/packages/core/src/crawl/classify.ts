/**
 * What kind of page is this?
 *
 * Rules first, LLM only for what the rules cannot decide (that batch call
 * arrives in M3). Most pages are settled by their URL and heading alone, so
 * sending every page to a model would be paying for an answer we already have.
 *
 * Priority when a page fits more than one: location > service > article > rest.
 * A page that names both a service and an area is a location page — those are
 * what rank for "service + district" searches, and counting them as plain
 * service pages would hide the gap the report exists to show.
 */
import type { PageType } from "../types/index.ts";
import type { ExtractedPage } from "./extract.ts";

export interface ClassifyInput {
  url: string;
  title: string | null;
  h1: string[];
  schemaTypes: string[];
  wordCount: number;
  /** Homepage of the site being crawled, so "/" is recognised. */
  isHomepage?: boolean;
  /** Area names from the client record, e.g. ["ภูเก็ต","ป่าตอง"]. */
  areas?: string[];
}

export interface ClassifyResult {
  type: PageType;
  confidence: number;
  /** Which signal decided it — shown in the admin when a human checks. */
  reason: string;
}

/**
 * `\b` cannot be used here.
 *
 * JavaScript defines a word boundary against ASCII word characters, and every
 * Thai character counts as a non-word character — so `ติดต่อ\b` never matches
 * inside a Thai slug. This lookahead says "not followed by more of an ASCII
 * word", which behaves the same for English and actually works for Thai.
 */
const END = "(?![a-z0-9_])";

const PATTERNS: { type: PageType; re: RegExp; reason: string }[] = [
  { type: "contact", re: rx("contact-us|contact|ติดต่อเรา|ติดต่อ"), reason: "url:contact" },
  { type: "about", re: rx("about-us|about|our-story|เกี่ยวกับเรา|เกี่ยวกับ"), reason: "url:about" },
  { type: "faq", re: rx("faqs|faq|questions|คำถามที่พบบ่อย"), reason: "url:faq" },
  { type: "article", re: rx("blog|news|articles|article|บทความ|ข่าว|post"), reason: "url:article" },
  { type: "service", re: rx("services|service|products|product|บริการ|สินค้า"), reason: "url:service" },
  { type: "other", re: rx("privacy|terms|policy|cart|checkout|search|tag|category|login|register|นโยบาย|เงื่อนไข"), reason: "url:boilerplate" },
];

/** `/(a|b|c)` followed by anything that is not more of an ASCII word. */
function rx(alternatives: string): RegExp {
  return new RegExp(`/(${alternatives})${END}`, "i");
}

const SERVICE_SCHEMA = ["Service", "Product", "Offer"];
const ARTICLE_SCHEMA = ["Article", "BlogPosting", "NewsArticle"];

export function classifyPage(input: ClassifyInput): ClassifyResult {
  const url = input.url.toLowerCase();
  const path = pathOf(url);
  const heading = [input.title ?? "", ...input.h1].join(" ").toLowerCase();

  // Homepage is unambiguous.
  if (input.isHomepage || path === "/" || path === "") {
    return { type: "home", confidence: 1, reason: "url:root" };
  }

  // Structured data is the site telling us directly.
  if (input.schemaTypes.some((t) => ARTICLE_SCHEMA.includes(t))) {
    return { type: "article", confidence: 0.9, reason: "schema:Article" };
  }
  if (input.schemaTypes.includes("FAQPage")) {
    return { type: "faq", confidence: 0.95, reason: "schema:FAQPage" };
  }
  if (input.schemaTypes.includes("ContactPage")) {
    return { type: "contact", confidence: 0.95, reason: "schema:ContactPage" };
  }

  // An area name in the URL or the heading beats everything below it.
  const area = matchedArea(url, heading, input.areas ?? []);
  if (area) {
    return { type: "location", confidence: 0.85, reason: `area:${area}` };
  }

  for (const p of PATTERNS) {
    if (p.re.test(path)) {
      // A "services" index that lists everything without detail is not a
      // service page — it converts nobody and would inflate the page count
      // the competitor comparison rests on.
      if (p.type === "service" && input.wordCount < 120) {
        return { type: "other", confidence: 0.6, reason: "service-index:thin" };
      }
      return { type: p.type, confidence: 0.8, reason: p.reason };
    }
  }

  if (input.schemaTypes.some((t) => SERVICE_SCHEMA.includes(t))) {
    return { type: "service", confidence: 0.75, reason: "schema:Service" };
  }

  // Nothing decisive. Low confidence tells the caller to ask the LLM (M3) and
  // flags it for human review in the admin.
  return { type: "other", confidence: 0.3, reason: "no-signal" };
}

/** Apply the classifier to a crawled page. */
export function classifyExtracted(
  page: ExtractedPage,
  opts: { isHomepage?: boolean; areas?: string[] } = {},
): ClassifyResult {
  return classifyPage({
    url: page.url,
    title: page.title,
    h1: page.h1,
    schemaTypes: page.schemaTypes,
    wordCount: page.wordCount,
    ...opts,
  });
}

function matchedArea(url: string, heading: string, areas: string[]): string | null {
  for (const area of areas) {
    const a = area.trim().toLowerCase();
    if (!a) continue;
    if (heading.includes(a)) return area;
    // Thai in a URL is usually percent-encoded, so decode before comparing.
    if (safeDecode(url).includes(a)) return area;
  }
  return null;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * The path, decoded.
 *
 * `URL.pathname` percent-encodes non-ASCII, so a Thai slug arrives as
 * `/%E0%B8%95%E0%B8%B4...` and no Thai pattern can ever match it. Thai sites
 * routinely use Thai slugs, so decoding here is not a nicety.
 */
function pathOf(url: string): string {
  try {
    return safeDecode(new URL(url).pathname).toLowerCase();
  } catch {
    return safeDecode(url).toLowerCase();
  }
}
