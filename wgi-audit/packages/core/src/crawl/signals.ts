/**
 * Signals a page gives away about the business behind it.
 *
 * Pure functions of the HTML we already fetched — no network, no cost. They
 * exist for the seller's side of the product rather than the client's: an
 * audit says what is wrong with a site, but before spending an hour on a
 * proposal you want to know three cheaper things first.
 *
 *   1. **Are they spending on ads?** A Meta Pixel or a Google Ads conversion
 *      tag means money is already flowing to this site every month. A site
 *      that converts badly while ads run is the single strongest sales pitch
 *      there is — every finding becomes "this is what your ad budget is
 *      leaking through" — so it is worth knowing before anything else.
 *   2. **Is anybody home?** A parked domain, a hosting default page, a
 *      "coming soon" that has said so since 2019 — none of these are leads,
 *      however many findings the rules produce against them.
 *   3. **Where else do they live?** Facebook, LINE, TikTok links tell us how
 *      to reach them and whether the business is active somewhere the site
 *      is not.
 *
 * Every detector returns evidence, never a bare boolean, so the dashboard can
 * show *why* it thinks a business is running Meta ads.
 */

export type AdPlatform = "meta" | "google_ads" | "gtm" | "ga4" | "tiktok" | "line";

/** One ad/analytics tag found on the page, with what gave it away. */
export interface AdTag {
  platform: AdPlatform;
  evidence: string;
}

/**
 * Tag fingerprints. Each pattern is something the vendor's own snippet emits,
 * not something a site would write by hand, so a hit is a strong signal.
 *
 * GTM and GA4 are tracked but are *not* ad spend on their own — most sites
 * have analytics. They are kept because GTM very often carries the ad tags
 * inside it where we cannot see them, which is why `runningAds` below treats
 * GTM as "possibly" rather than "no".
 */
const AD_PATTERNS: { platform: AdPlatform; pattern: RegExp; label: string }[] = [
  { platform: "meta",       pattern: /connect\.facebook\.net\/[^"'\s]*fbevents\.js/i, label: "fbevents.js" },
  { platform: "meta",       pattern: /\bfbq\s*\(\s*['"]init['"]/i,                     label: "fbq('init')" },
  { platform: "google_ads", pattern: /googleads\.g\.doubleclick\.net/i,                 label: "doubleclick conversion" },
  { platform: "google_ads", pattern: /['"]AW-\d{6,}['"]/,                               label: "AW- conversion id" },
  { platform: "google_ads", pattern: /google_conversion_id/i,                           label: "google_conversion_id" },
  { platform: "gtm",        pattern: /googletagmanager\.com\/gtm\.js/i,                 label: "gtm.js" },
  { platform: "gtm",        pattern: /['"]GTM-[A-Z0-9]{4,}['"]/,                        label: "GTM- container" },
  { platform: "ga4",        pattern: /['"]G-[A-Z0-9]{6,}['"]/,                          label: "G- measurement id" },
  { platform: "tiktok",     pattern: /analytics\.tiktok\.com\/i18n\/pixel/i,            label: "tiktok pixel" },
  { platform: "tiktok",     pattern: /\bttq\.load\s*\(/i,                               label: "ttq.load()" },
  { platform: "line",       pattern: /tag\.line\.me\/tag\.js/i,                         label: "LINE Tag" },
  { platform: "line",       pattern: /\b_lt\s*\(\s*['"]init['"]/i,                     label: "_lt('init')" },
];

export function detectAdTags(html: string): AdTag[] {
  const out: AdTag[] = [];
  const seen = new Set<AdPlatform>();
  for (const { platform, pattern, label } of AD_PATTERNS) {
    if (seen.has(platform)) continue;
    if (pattern.test(html)) {
      seen.add(platform);
      out.push({ platform, evidence: label });
    }
  }
  return out;
}

/** Platforms that only exist to serve or measure paid traffic. */
const PAID_PLATFORMS: AdPlatform[] = ["meta", "google_ads", "tiktok", "line"];

/**
 * "Are they buying traffic?" from the tags alone.
 *
 * `yes` needs a platform that has no reason to be there except ads. `maybe`
 * is a GTM container: it can hold the ad tags out of our sight, and a great
 * many Thai SMEs get their pixels installed that way by an agency.
 */
export function adsVerdict(tags: AdTag[]): "yes" | "maybe" | "no" {
  if (tags.some((t) => PAID_PLATFORMS.includes(t.platform))) return "yes";
  if (tags.some((t) => t.platform === "gtm")) return "maybe";
  return "no";
}

// ---------------------------------------------------------------------------
// social presence
// ---------------------------------------------------------------------------
export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "line" | "youtube" | "lemon8";

const SOCIAL_HOSTS: { platform: SocialPlatform; host: RegExp; reject?: RegExp }[] = [
  // Reject the share/plugin URLs every site carries; keep only a profile.
  { platform: "facebook",  host: /(^|\.)facebook\.com$/i, reject: /\/(sharer|plugins|dialog|tr\b|login)/i },
  { platform: "instagram", host: /(^|\.)instagram\.com$/i, reject: /\/(p|reel|explore)\// },
  { platform: "tiktok",    host: /(^|\.)tiktok\.com$/i },
  { platform: "line",      host: /(^|\.)(line\.me|lin\.ee)$/i },
  { platform: "youtube",   host: /(^|\.)(youtube\.com|youtu\.be)$/i, reject: /\/(embed|watch)/i },
  { platform: "lemon8",    host: /(^|\.)lemon8-app\.com$/i },
];

/** Profile links to other platforms, one per platform, first seen wins. */
export function detectSocialLinks(urls: string[]): Partial<Record<SocialPlatform, string>> {
  const out: Partial<Record<SocialPlatform, string>> = {};
  for (const raw of urls) {
    let host: string;
    let path: string;
    try {
      const u = new URL(raw);
      host = u.hostname.replace(/^www\./, "");
      path = u.pathname;
    } catch {
      continue;
    }
    for (const s of SOCIAL_HOSTS) {
      if (out[s.platform]) continue;
      if (!s.host.test(host)) continue;
      if (s.reject?.test(path)) continue;
      if (path === "/" || path === "") continue; // the platform's homepage is not a profile
      out[s.platform] = raw;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// is anybody home?
// ---------------------------------------------------------------------------
/**
 * Phrases that appear on a page nobody built. A domain seller's holding page,
 * a hosting panel's default, a "coming soon" template. Thai included because
 * the target market's placeholders are in Thai.
 */
const PARKED = [
  /domain (is|may be) for sale/i, /buy this domain/i, /this domain is parked/i,
  /parked free, courtesy of/i, /sedo\.com|dan\.com|afternic/i,
  /welcome to nginx/i, /apache2 (ubuntu|debian) default page/i, /it works!/i,
  /index of \//i, /default web site page/i, /website coming soon/i,
  /under construction/i, /site is under maintenance/i,
  /เว็บไซต์(นี้)?อยู่ระหว่าง(การ)?(ปรับปรุง|จัดทำ|ก่อสร้าง)/, /กำลังปรับปรุง(เว็บไซต์)?/,
  /เร็ว ๆ นี้|เร็วๆ นี้/, /coming soon/i,
];

/**
 * True when the page looks like a placeholder rather than a business.
 *
 * Requires the page to also be *thin*: "under construction" inside a real
 * site's blog post is not a parked domain. Fifty words is enough to write a
 * placeholder and not enough to run a business on.
 */
export function looksParked(title: string | null, bodyText: string, wordCount: number): boolean {
  if (wordCount > 60) return false;
  const hay = `${title ?? ""} ${bodyText}`;
  return PARKED.some((p) => p.test(hay));
}

/**
 * The most recent year the site admits to.
 *
 * A footer that still says © 2019 is not proof of abandonment, but it is a
 * cheap, honest signal of how much attention the site gets, and a lead whose
 * last touch was five years ago is a different conversation. Thai sites often
 * write the Buddhist year — 2567 — which is 543 ahead of the Gregorian one.
 */
export function detectCopyrightYear(text: string, now = new Date()): number | null {
  const thisYear = now.getFullYear();
  const candidates: number[] = [];

  for (const m of text.matchAll(/(?:©|&copy;|\(c\)|copyright|ลิขสิทธิ์|สงวนลิขสิทธิ์)[^0-9]{0,40}(\d{4})(?:\s*[-–]\s*(\d{4}))?/gi)) {
    for (const g of [m[1], m[2]]) {
      if (!g) continue;
      let y = Number(g);
      if (y >= 2400 && y <= thisYear + 543 + 1) y -= 543; // พ.ศ. → ค.ศ.
      if (y >= 1995 && y <= thisYear + 1) candidates.push(y);
    }
  }
  return candidates.length ? Math.max(...candidates) : null;
}
