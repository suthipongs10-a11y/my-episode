/**
 * Turn one HTML page into the fields the rules need.
 *
 * A pure function of (url, html): no network, no database. Everything the
 * rules engine later decides is grounded in what this returns, so this file is
 * where "what did we actually see on the page" is defined — and it is fully
 * testable against fixtures on disk.
 */
import * as cheerio from "cheerio";
import type { PageRecord } from "../types/index.ts";
import {
  detectBranchMentions, detectAdTags, detectCopyrightYear, detectSocialLinks, looksParked,
  type AdTag, type SocialPlatform,
} from "./signals.ts";

/** Whatever `$(...)` returns. Derived from cheerio's own API type so this
 *  keeps compiling across cheerio versions without naming its internals. */
type Selection = ReturnType<cheerio.CheerioAPI>;

/** Thai and English words that mark a price, used by CVR-006. */
const PRICE_HINTS = [
  "ราคา", "บาท", "เริ่มต้น", "ค่าบริการ", "เรทราคา",
  "price", "pricing", "starting at", "thb",
];

/** Markers of a testimonial section, used by CVR-007. */
const REVIEW_HINTS = [
  "รีวิว", "ความคิดเห็นลูกค้า", "ลูกค้าของเรา", "เสียงจากลูกค้า",
  "review", "testimonial", "what our clients say",
];

/** Hosts that serve stock photography, used by CVR-008. */
const STOCK_HOSTS = [
  "shutterstock", "istockphoto", "gettyimages", "unsplash", "pexels",
  "pixabay", "freepik", "depositphotos", "123rf", "dreamstime",
];

export interface ExtractOptions {
  /** The site being crawled; decides internal vs external links. */
  domain: string;
  isCompetitor?: boolean;
  statusCode?: number;
}

export interface ExtractedPage extends PageRecord {
  /** Absolute, same-domain links, for the crawler to follow next. */
  internalUrls: string[];
  /** Every href seen, absolute where resolvable. Used to spot 404s later. */
  allUrls: string[];
  /** Hosts of images, so stock photography is detectable. */
  imageHosts: string[];
  /** Present when the page declares one; TEC-007 needs it. */
  hasViewport: boolean;
  /** True when http:// resources appear on an https:// page (TEC-001). */
  hasMixedContent: boolean;
  /** `noindex` in a robots meta tag, for the index-ratio check. */
  isNoindex: boolean;
  /** Above-the-fold CTA detection needs the first chunk of body HTML. */
  hasAboveFoldCta: boolean;
  hasStickyCta: boolean;
  /**
   * Seller-side signals (crawl/signals.ts). Kept off `PageRecord` so the
   * `pages` table is unchanged; they travel in the page snapshot instead.
   */
  adTags: AdTag[];
  socialLinks: Partial<Record<SocialPlatform, string>>;
  looksParked: boolean;
  copyrightYear: number | null;
  /** Self-reported in JSON-LD `aggregateRating`; null when the page says nothing. */
  reviewCount: number | null;
  /** Distinct postal addresses in JSON-LD — two of them is a second branch. */
  addressCount: number;
  /** The largest "N สาขา" claim in the text; 0 when there is none. */
  branchMentions: number;
}

export function extractPage(
  url: string,
  html: string,
  opts: ExtractOptions,
): ExtractedPage {
  const $ = cheerio.load(html);
  const isHttps = url.toLowerCase().startsWith("https://");

  // -- head -----------------------------------------------------------------
  const title = text($("title").first());
  const metaDesc = attr($('meta[name="description"]').first(), "content");
  const lang = attr($("html").first(), "lang");
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const robotsMeta = (attr($('meta[name="robots"]').first(), "content") ?? "").toLowerCase();
  const isNoindex = robotsMeta.includes("noindex");

  // -- headings -------------------------------------------------------------
  const h1 = $("h1").map((_, el) => text($(el))).get().filter(Boolean);

  // -- body text ------------------------------------------------------------
  const $body = $("body").clone();
  $body.find("script, style, noscript, template").remove();
  const bodyText = collapse($body.text());
  const wordCount = countWords(bodyText);

  // -- links ----------------------------------------------------------------
  let internalLinks = 0;
  let externalLinks = 0;
  let hasTelLink = false;
  let hasLineLink = false;
  const internalUrls: string[] = [];
  const allUrls: string[] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href) return;
    const lower = href.toLowerCase();

    if (lower.startsWith("tel:")) {
      hasTelLink = true;
      return;
    }
    if (isLineLink(lower)) hasLineLink = true;
    if (lower.startsWith("mailto:") || lower.startsWith("javascript:") || lower.startsWith("#")) {
      return;
    }

    const abs = absolute(href, url);
    if (!abs) return;
    allUrls.push(abs);
    if (sameDomain(abs, opts.domain)) {
      internalLinks++;
      internalUrls.push(abs);
    } else {
      externalLinks++;
    }
  });

  // LINE can also appear as a bare id, a QR image, or an onclick handler.
  if (!hasLineLink) hasLineLink = /line\.me|lin\.ee|@line|line\s*id|ไลน์ไอดี/i.test(html);

  // -- images ---------------------------------------------------------------
  const imageHosts: string[] = [];
  let imagesTotal = 0;
  let imagesNoAlt = 0;
  $("img").each((_, el) => {
    imagesTotal++;
    const alt = ($(el).attr("alt") ?? "").trim();
    if (!alt) imagesNoAlt++;
    const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "";
    const abs = absolute(src, url);
    if (abs) imageHosts.push(hostOf(abs));
  });

  // -- forms ----------------------------------------------------------------
  const $forms = $("form");
  const hasForm = $forms.length > 0;
  let formFieldCount = 0;
  $forms.each((_, form) => {
    const fields = $(form)
      .find("input, select, textarea")
      .filter((_i, el) => {
        const t = ($(el).attr("type") ?? "").toLowerCase();
        // Hidden fields and the submit button are not work for the visitor.
        return !["hidden", "submit", "button", "image", "reset"].includes(t);
      });
    formFieldCount = Math.max(formFieldCount, fields.length);
  });

  // -- structured data ------------------------------------------------------
  const schemaTypes = collectSchemaTypes($, html);
  const jsonLd = collectJsonLdFacts($);

  // -- conversion signals ---------------------------------------------------
  const lowerHtml = html.toLowerCase();
  const hasPrice = PRICE_HINTS.some((h) => lowerHtml.includes(h));
  const hasReview = REVIEW_HINTS.some((h) => lowerHtml.includes(h));
  const hasMixedContent = isHttps && /(?:src|href)\s*=\s*["']http:\/\//i.test(html);

  return {
    url,
    domain: opts.domain,
    isCompetitor: opts.isCompetitor ?? false,
    statusCode: opts.statusCode ?? null,
    pageType: "other", // set by 04-classify
    title,
    titleLen: title?.length ?? 0,
    metaDesc,
    metaDescLen: metaDesc?.length ?? 0,
    h1,
    h1Count: h1.length,
    wordCount,
    internalLinks,
    externalLinks,
    imagesTotal,
    imagesNoAlt,
    schemaTypes,
    hasTelLink,
    hasLineLink,
    hasForm,
    formFieldCount,
    hasPrice,
    hasReview,
    lang,
    internalUrls: unique(internalUrls),
    allUrls: unique(allUrls),
    imageHosts: unique(imageHosts),
    hasViewport,
    hasMixedContent,
    isNoindex,
    hasAboveFoldCta: detectAboveFoldCta($),
    hasStickyCta: detectStickyCta($, html),
    adTags: detectAdTags(html),
    socialLinks: detectSocialLinks(allUrls),
    looksParked: looksParked(title, bodyText, wordCount),
    copyrightYear: detectCopyrightYear(bodyText),
    reviewCount: jsonLd.reviewCount,
    addressCount: jsonLd.addressCount,
    branchMentions: detectBranchMentions(bodyText),
  };
}

/** True when every image comes from a stock library (CVR-008). */
export function looksAllStock(imageHosts: string[]): boolean {
  const external = imageHosts.filter((h) => STOCK_HOSTS.some((s) => h.includes(s)));
  return imageHosts.length > 0 && external.length === imageHosts.length;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function text($el: Selection): string | null {
  const t = collapse($el.text());
  return t || null;
}

function attr($el: Selection, name: string): string | null {
  const v = $el.attr(name);
  return v ? collapse(v) : null;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Word count that works for Thai.
 *
 * Thai does not put spaces between words, so splitting on whitespace would
 * report a 600-word Thai page as a handful of "words" and every content-length
 * rule would fire on every Thai site. Thai runs are counted by characters at a
 * conventional ~4 characters per word instead.
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const thaiChars = (text.match(/[฀-๿]/g) ?? []).length;
  const latinWords = (text.match(/[A-Za-z0-9À-ɏ]+/g) ?? []).length;
  return latinWords + Math.round(thaiChars / 4);
}

/**
 * `lin.ee` is the short domain LINE Official Account hands every business for
 * its "add friend" button, and it is what most Thai SMEs actually paste into
 * their sites — a LINE check that only knows `line.me` misses the common case.
 */
function isLineLink(href: string): boolean {
  return href.includes("line.me") || href.includes("lin.ee")
    || href.includes("liff.line") || href.startsWith("line://");
}

export function absolute(href: string, base: string): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function sameDomain(url: string, domain: string): boolean {
  const host = hostOf(url);
  const target = domain.toLowerCase().replace(/^www\./, "");
  return host === target || host.endsWith("." + target);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

/** JSON-LD `@type` values, plus microdata `itemtype`. */
function collectSchemaTypes($: cheerio.CheerioAPI, html: string): string[] {
  const types: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      collectTypes(JSON.parse(raw), types);
    } catch {
      // Broken JSON-LD is common in the wild. Fall back to reading the
      // declared types out of the text rather than losing them entirely.
      for (const m of raw.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
        if (m[1]) types.push(m[1]);
      }
    }
  });

  for (const m of html.matchAll(/itemtype=["']https?:\/\/schema\.org\/([^"']+)["']/gi)) {
    if (m[1]) types.push(m[1]);
  }

  return unique(types);
}

/**
 * Two facts a business states about itself in JSON-LD: how many reviews it
 * has, and how many addresses it lists. Self-reported, so the opportunity
 * score treats them as a hint, not as Google's word — but a site that says
 * "5 branches, 240 reviews" in structured data is telling us something.
 */
function collectJsonLdFacts($: cheerio.CheerioAPI): { reviewCount: number | null; addressCount: number } {
  let reviewCount: number | null = null;
  const addresses = new Set<string>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    const rating = obj.aggregateRating;
    if (rating && typeof rating === "object" && !Array.isArray(rating)) {
      const r = rating as Record<string, unknown>;
      const n = toCount(r.reviewCount ?? r.ratingCount);
      if (n !== null) reviewCount = Math.max(reviewCount ?? 0, n);
    }

    const addr = obj.address;
    for (const a of Array.isArray(addr) ? addr : [addr]) {
      if (typeof a === "string" && a.trim()) addresses.add(a.trim());
      else if (a && typeof a === "object") {
        const fields = Object.entries(a as Record<string, unknown>)
          .filter(([k]) => !k.startsWith("@")).sort();
        if (fields.length) addresses.add(JSON.stringify(fields));
      }
    }

    for (const v of Object.values(obj)) walk(v);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      walk(JSON.parse(raw));
    } catch {
      // Broken JSON-LD: the schema-type fallback above still runs; these
      // two facts are simply unknown.
    }
  });

  return { reviewCount, addressCount: addresses.size };
}

function toCount(v: unknown): number | null {
  const n = typeof v === "number" ? v
    : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.push(t);
  if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.push(x);
  for (const v of Object.values(obj)) collectTypes(v, out);
}

const CTA_WORDS = [
  "โทร", "ติดต่อ", "สอบถาม", "จองคิว", "นัดหมาย", "ขอใบเสนอราคา", "แอดไลน์", "ทักไลน์",
  "call", "contact", "get a quote", "book now", "enquire", "line",
];

/**
 * Is there a call to action before the visitor scrolls?
 *
 * Real above-the-fold detection needs a rendered layout, which crawling with
 * cheerio does not give us. The workable proxy is: a tel/LINE link or a CTA-ish
 * button inside the header, the hero, or the first stretch of the body.
 */
function detectAboveFoldCta($: cheerio.CheerioAPI): boolean {
  const regions = $("header, .hero, .banner, .jumbotron, [class*='hero'], [id*='hero']");
  if (hasCta($, regions)) return true;

  const $body = $("body").children().slice(0, 6);
  return hasCta($, $body);
}

/** Containers whose links are site navigation rather than a call to action. */
const NAV_SELECTOR = "nav, [role='navigation'], .menu, .nav, .navbar, .navigation, #menu, #nav";

function hasCta($: cheerio.CheerioAPI, $scope: Selection): boolean {
  if ($scope.length === 0) return false;

  // A tap-to-call or LINE link is a real call to action wherever it sits —
  // tapping it starts the conversation.
  if ($scope.find('a[href^="tel:"], a[href*="line.me"], a[href*="lin.ee"]').length > 0) return true;

  // A worded link or button only counts outside the menu. Every site has
  // "ติดต่อเรา" in its navigation; if that counted, CVR-005 would never fire
  // and the check would tell the owner nothing.
  let found = false;
  $scope.find("a, button").each((_, el) => {
    if (found) return;
    const $el = $(el);
    if ($el.closest(NAV_SELECTOR).length > 0) return;
    const label = collapse($el.text()).toLowerCase();
    if (label && CTA_WORDS.some((w) => label.includes(w))) found = true;
  });
  return found;
}

/**
 * A CTA bar pinned to the screen on mobile.
 *
 * Detected from class and id names plus inline styles, which is how these are
 * built in practice. A stylesheet-driven one is missed; that is a false
 * negative on a check whose finding is "add one", so the cost is low.
 */
function detectStickyCta($: cheerio.CheerioAPI, html: string): boolean {
  const selector =
    "[class*='sticky'], [class*='fixed'], [id*='sticky'], [id*='floating'], " +
    "[class*='floating'], [class*='fab'], [class*='call-now'], [class*='callnow']";
  let found = false;
  $(selector).each((_, el) => {
    if (found) return;
    const $el = $(el);
    if ($el.find('a[href^="tel:"], a[href*="line.me"], a[href*="lin.ee"]').length > 0) found = true;
    else {
      const label = collapse($el.text()).toLowerCase();
      if (label && CTA_WORDS.some((w) => label.includes(w))) found = true;
    }
  });
  if (found) return true;
  return /position\s*:\s*(fixed|sticky)[^;}]*/i.test(html) &&
    /tel:|line\.me|lin\.ee/i.test(html);
}
