/**
 * The readability gate: is this HTML the site, and is there anything to read?
 *
 * A fetch can return 200 with a page that is not the business's page at all:
 *
 *   - **a bot wall** — Cloudflare's "Just a moment…", Imperva, Sucuri, Akamai
 *     — where the body is the firewall's interstitial, not the site;
 *   - **a JavaScript app shell** — a root `<div>` and a bundle, with the real
 *     page assembled in a browser this crawler is not.
 *
 * Scoring either produces a report full of confident, wrong findings — "no
 * H1, no contact button, thin content" — about a page nobody ever saw. That is
 * the one failure this product must never have, so the gate stops the run
 * *before* scoring and says which of the two it hit. Every check here is a
 * string the wall or the framework wrote itself; nothing is inferred.
 */
import { countWords } from "./extract.ts";

export interface Wall {
  vendor: string;
  /** The marker that gave it away, for the log. */
  evidence: string;
}

/**
 * Markers each vendor puts in its own interstitial. A phrase alone is not
 * enough — a real page may say "protected by Cloudflare" in its footer — so a
 * match only counts on a thin body or a blocking status, which is what an
 * interstitial always is and a real page almost never is.
 */
const WALLS: { vendor: string; re: RegExp }[] = [
  {
    vendor: "Cloudflare",
    re: /<title>\s*just a moment|cf-chl|__cf_chl|challenge-platform|cf-browser-verification|checking your browser before accessing|<title>\s*attention required!?\s*\|\s*cloudflare|sorry, you have been blocked|cf-error-details/i,
  },
  { vendor: "Imperva", re: /_Incapsula_Resource|incapsula incident id|<title>\s*imperva/i },
  { vendor: "Sucuri", re: /sucuri website firewall|access denied - sucuri/i },
  { vendor: "Akamai", re: /<title>\s*access denied\s*<\/title>[\s\S]{0,2000}?reference\s*#\s*\d/i },
  { vendor: "DDoS-Guard", re: /ddos-guard\.net|<title>\s*ddos-guard/i },
  { vendor: "CAPTCHA", re: /<title>[^<]*(captcha|verify you are human|are you a robot|human verification)[^<]*<\/title>/i },
];

/** Statuses a wall answers with. 200 is possible too — hence the body check. */
const BLOCKING_STATUS = new Set([401, 403, 405, 406, 429, 503]);

/** An interstitial has a sentence or two; a business page has paragraphs. */
const THIN_WORDS = 80;

export function detectChallenge(
  html: string, headers: Record<string, string> = {}, status = 200,
): Wall | null {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = v;
  // Cloudflare labels its own challenges; the header is the vendor saying so.
  if ((h["cf-mitigated"] ?? "").toLowerCase() === "challenge") {
    return { vendor: "Cloudflare", evidence: "cf-mitigated: challenge" };
  }

  const body = html ?? "";
  let thin: boolean | null = null;
  for (const w of WALLS) {
    const m = w.re.exec(body);
    if (!m) continue;
    thin ??= countWords(visibleText(body)) < THIN_WORDS;
    if (thin || BLOCKING_STATUS.has(status)) {
      return { vendor: w.vendor, evidence: m[0].slice(0, 60) };
    }
  }
  return null;
}

export interface Shell {
  /** `shell`: a framework's empty root. `empty`: nothing at all to read. */
  kind: "shell" | "empty";
  evidence: string;
}

/** An empty mount point, the way React, Vue, Next, Nuxt, Gatsby and Angular leave it. */
const APP_ROOT =
  /<(div|main|section)\b[^>]*\bid=["'](root|app|__next|__nuxt|___gatsby|__layout|q-app|svelte|application)["'][^>]*>\s*(?:<!--[\s\S]*?-->\s*)*<\/\1>/i;
const APP_MARKS =
  /data-reactroot|id=["']__NEXT_DATA__["']|window\.__NUXT__|ng-version=|<app-root\b|you need to enable javascript/i;

/**
 * Nothing to audit on this page.
 *
 * The bar is deliberately low — under twenty words *and* under three internal
 * links — so a thin but real landing page with a menu still passes, and only
 * a page whose content the browser was going to build is stopped.
 */
export function looksUnrendered(
  html: string, page: { wordCount: number; internalLinks: number },
): Shell | null {
  if (page.wordCount >= 20 || page.internalLinks >= 3) return null;
  if (APP_ROOT.test(html)) return { kind: "shell", evidence: "empty app root" };
  if (APP_MARKS.test(html)) return { kind: "shell", evidence: "framework markers, no text" };
  const scripts = (html.match(/<script\b/gi) ?? []).length;
  return {
    kind: scripts > 0 ? "shell" : "empty",
    evidence: `${page.wordCount} words, ${page.internalLinks} links, ${scripts} scripts`,
  };
}

function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}
