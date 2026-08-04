/**
 * The only way this codebase reaches the network.
 *
 * Three jobs:
 *
 *  1. **Cache to disk.** Re-running a stage during development must not cost
 *     money or hammer somebody's site. The key is a hash of method + url +
 *     body, and the TTL depends on what kind of thing was fetched.
 *  2. **Record the cost.** Every call, cache hits included, goes to the ledger.
 *  3. **Be a good citizen.** One request per second per domain, an honest
 *     user agent, and robots.txt respected for sites we were not invited to.
 *
 * ## robots.txt, and why the client's own site is different
 *
 * robots.txt is a request from a site owner to crawlers arriving uninvited.
 * A client who submits their own domain to be audited has invited us, so
 * `respectRobots: false` is correct for their pages — and necessary, because a
 * great many small-business sites sit behind a WAF or ship a blanket
 * `Disallow: /`, and refusing to read them would break the product for exactly
 * the customers it is for.
 *
 * Competitors never granted anything, so their robots.txt is honoured in full.
 * The caller has to state which case applies; there is no default that is
 * right for both.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CostEntry, Ledger } from "../cost/ledger.ts";
import { env } from "../env.ts";

export type CacheKind = "html" | "robots" | "sitemap" | "psi" | "serp" | "places" | "llm";

/** How long each kind stays fresh. Cheap and stable things live longer. */
export const TTL_SECONDS: Record<CacheKind, number> = {
  html: 60 * 60 * 24 * 7,
  robots: 60 * 60 * 24 * 7,
  sitemap: 60 * 60 * 24 * 7,
  psi: 60 * 60 * 24 * 3,
  serp: 60 * 60 * 24 * 3,
  places: 60 * 60 * 24 * 7,
  llm: 60 * 60 * 24 * 30,
};

export interface FetchOptions {
  kind: CacheKind;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  /** Honour robots.txt. True for anything we were not invited to read. */
  respectRobots: boolean;
  /** Cost of this call in THB, if it is a paid API. */
  costThb?: number;
  provider?: string;
  /** Skip the cache read (still writes). */
  noCache?: boolean;
  /**
   * Derive cost and ledger metadata from the response.
   *
   * Some APIs are priced by what they return rather than by what you ask for —
   * an LLM bills for tokens it decided to emit. Returning the cost from here
   * keeps that as one ledger row with the real number, instead of a guess at
   * call time plus a correction afterwards. On a cache hit the metadata is
   * still recorded but the cost is forced to 0, which is the point of caching.
   */
  onCost?: (result: FetchResult) => Partial<CostEntry>;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  url: string;
  finalUrl: string;
  body: string;
  headers: Record<string, string>;
  cacheHit: boolean;
  elapsedMs: number;
  error?: string;
  blockedByRobots?: boolean;
}

export interface CachedFetchDeps {
  ledger?: Ledger;
  cacheDir?: string;
  userAgent?: string;
  /** Injected in tests so nothing touches the network. */
  fetchImpl?: typeof fetch;
  /** Injected in tests so the politeness delay does not slow the suite. */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Milliseconds between requests to one domain. */
  perDomainDelayMs?: number;
  now?: () => number;
}

export class CachedFetch {
  private lastHitAt = new Map<string, number>();
  private robots = new Map<string, RobotsRules | null>();
  private readonly cacheDir: string;
  private readonly userAgent: string;
  private readonly doFetch: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly delayMs: number;
  private readonly now: () => number;

  constructor(private readonly deps: CachedFetchDeps = {}) {
    const e = env();
    this.cacheDir = deps.cacheDir ?? e.CACHE_DIR;
    this.userAgent = deps.userAgent ?? e.HTTP_USER_AGENT;
    this.doFetch = deps.fetchImpl ?? fetch;
    this.sleep = deps.sleepImpl ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.delayMs = deps.perDomainDelayMs ?? 1000;
    this.now = deps.now ?? Date.now;
  }

  async get(url: string, opts: FetchOptions): Promise<FetchResult> {
    const started = this.now();
    const key = cacheKey(opts.method ?? "GET", url, opts.body);

    // 1. cache
    if (!opts.noCache) {
      const hit = await this.readCache(key, TTL_SECONDS[opts.kind]);
      if (hit) {
        await this.deps.ledger?.record({
          provider: opts.provider ?? hostOf(url),
          endpoint: opts.kind,
          ...(opts.onCost?.(hit) ?? {}),
          costThb: 0, // last: a cache hit is free whatever onCost worked out
          cacheHit: true,
        });
        return { ...hit, cacheHit: true, elapsedMs: this.now() - started };
      }
    }

    // 2. robots, for sites that did not invite us
    if (opts.respectRobots) {
      const allowed = await this.allowed(url);
      if (!allowed) {
        return {
          ok: false,
          status: 0,
          url,
          finalUrl: url,
          body: "",
          headers: {},
          cacheHit: false,
          elapsedMs: this.now() - started,
          blockedByRobots: true,
          error: "blocked by robots.txt",
        };
      }
    }

    // 3. politeness
    await this.throttle(hostOf(url));

    // 4. the call
    const result = await this.raw(url, opts, started);

    await this.deps.ledger?.record({
      provider: opts.provider ?? hostOf(url),
      endpoint: opts.kind,
      costThb: opts.costThb ?? 0,
      cacheHit: false,
      ...(result.ok ? (opts.onCost?.(result) ?? {}) : {}),
    });

    if (result.ok) await this.writeCache(key, result);
    return result;
  }

  // -- internals ----------------------------------------------------------
  private async raw(url: string, opts: FetchOptions, started: number): Promise<FetchResult> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 20_000);
    try {
      const res = await this.doFetch(url, {
        method: opts.method ?? "GET",
        headers: { "User-Agent": this.userAgent, ...(opts.headers ?? {}) },
        ...(opts.body === undefined ? {} : { body: opts.body }),
        signal: ctl.signal,
        redirect: "follow",
      });
      const body = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      return {
        ok: res.ok,
        status: res.status,
        url,
        finalUrl: res.url || url,
        body,
        headers,
        cacheHit: false,
        elapsedMs: this.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        url,
        finalUrl: url,
        body: "",
        headers: {},
        cacheHit: false,
        elapsedMs: this.now() - started,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async throttle(host: string): Promise<void> {
    const last = this.lastHitAt.get(host);
    const wait = last === undefined ? 0 : last + this.delayMs - this.now();
    if (wait > 0) await this.sleep(wait);
    this.lastHitAt.set(host, this.now());
  }

  /**
   * robots.txt is fetched with *our* user agent on purpose. Fetching it with a
   * generic client gets a 403 from most WAFs, and the conventional reading of
   * 403 is "disallow everything" — so a site that is perfectly happy to be read
   * would look entirely closed.
   */
  private async allowed(url: string): Promise<boolean> {
    const base = originOf(url);
    if (!this.robots.has(base)) {
      this.robots.set(base, await this.loadRobots(base));
    }
    const rules = this.robots.get(base) ?? null;
    if (!rules) return true;
    return isAllowed(rules, pathOf(url));
  }

  private async loadRobots(origin: string): Promise<RobotsRules | null> {
    const url = origin + "/robots.txt";
    const key = cacheKey("GET", url);
    const cached = await this.readCache(key, TTL_SECONDS.robots);
    const res = cached ?? (await this.throttle(hostOf(url)), await this.raw(url, {
      kind: "robots",
      respectRobots: false,
      timeoutMs: 10_000,
    }, this.now()));
    if (!cached && res.ok) await this.writeCache(key, res);

    if (res.status === 401 || res.status === 403) {
      // Refused even with an honest agent: treat the whole origin as closed.
      return { disallowAll: true, allow: [], disallow: [] };
    }
    if (!res.ok || !res.body.trim()) return null;
    return parseRobots(res.body, this.userAgent);
  }

  private cachePath(key: string): string {
    return join(this.cacheDir, key.slice(0, 2), key + ".json");
  }

  private async readCache(key: string, ttlSeconds: number): Promise<FetchResult | null> {
    try {
      const raw = await readFile(this.cachePath(key), "utf8");
      const entry = JSON.parse(raw) as { at: number; value: FetchResult };
      if (this.now() - entry.at > ttlSeconds * 1000) return null;
      return entry.value;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: FetchResult): Promise<void> {
    const path = this.cachePath(key);
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify({ at: this.now(), value }), "utf8");
    } catch {
      // A cache that cannot be written is a slow run, not a failed one.
    }
  }
}

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------
export interface RobotsRules {
  disallowAll: boolean;
  allow: string[];
  disallow: string[];
}

/**
 * Parse robots.txt for one user agent.
 *
 * Group selection follows the standard: the most specific matching agent wins,
 * `*` is the fallback, and rules for other agents are ignored entirely.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const ua = userAgent.toLowerCase();
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    if (!current) continue;
    lastWasAgent = false;
    if (field === "allow" && value) current.allow.push(value);
    if (field === "disallow") current.disallow.push(value);
  }

  const specific = groups.find((g) =>
    g.agents.some((a) => a !== "*" && ua.includes(a)),
  );
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const chosen = specific ?? wildcard;
  if (!chosen) return { disallowAll: false, allow: [], disallow: [] };

  return {
    disallowAll: false,
    allow: chosen.allow,
    disallow: chosen.disallow.filter((d) => d !== ""), // "Disallow:" empty = allow all
  };
}

/** Longest matching rule wins; Allow beats Disallow at equal length. */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  if (rules.disallowAll) return false;
  const longest = (list: string[]): number =>
    list.reduce((best, p) => (matches(p, path) && p.length > best ? p.length : best), -1);
  const a = longest(rules.allow);
  const d = longest(rules.disallow);
  if (d < 0) return true;
  return a >= d;
}

function matches(pattern: string, path: string): boolean {
  if (pattern === "") return false;
  if (!pattern.includes("*") && !pattern.endsWith("$")) return path.startsWith(pattern);
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  const anchored = escaped.endsWith("\\$") ? "^" + escaped.slice(0, -2) + "$" : "^" + escaped;
  try {
    return new RegExp(anchored).test(path);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
export function cacheKey(method: string, url: string, body?: string): string {
  return createHash("sha256").update(`${method} ${url} ${body ?? ""}`).digest("hex");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}
