/**
 * No network here. `fetchImpl` is injected, so these tests describe exactly
 * what the crawler does without any site being touched.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CachedFetch, isAllowed, parseRobots } from "./cached-fetch.ts";

let cacheDir: string;

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "wgi-cache-"));
});
afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
});

function respond(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: init.headers ?? { "content-type": "text/html" },
  });
}

/** A fetch stand-in that answers from a map and counts what it was asked for. */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    const handler = routes[url] ?? routes["*"];
    if (!handler) return new Response("not found", { status: 404 });
    return handler();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const noSleep = async () => {};

describe("parseRobots", () => {
  it("uses the wildcard group when no agent matches", () => {
    const r = parseRobots("User-agent: *\nDisallow: /admin\n", "WGIAuditBot/0.1");
    expect(r.disallow).toEqual(["/admin"]);
  });

  it("prefers a group naming our agent over the wildcard", () => {
    const r = parseRobots(
      "User-agent: *\nDisallow: /\n\nUser-agent: WGIAuditBot\nDisallow: /private\n",
      "WGIAuditBot/0.1",
    );
    expect(r.disallow).toEqual(["/private"]);
  });

  it("treats an empty Disallow as permission, not prohibition", () => {
    const r = parseRobots("User-agent: *\nDisallow:\n", "bot");
    expect(r.disallow).toEqual([]);
    expect(isAllowed(r, "/anything")).toBe(true);
  });

  it("groups consecutive user-agent lines together", () => {
    const r = parseRobots(
      "User-agent: googlebot\nUser-agent: WGIAuditBot\nDisallow: /x\n",
      "WGIAuditBot/0.1",
    );
    expect(r.disallow).toEqual(["/x"]);
  });

  it("ignores comments", () => {
    const r = parseRobots("# hello\nUser-agent: *  # all\nDisallow: /a # nope\n", "bot");
    expect(r.disallow).toEqual(["/a"]);
  });
});

describe("isAllowed", () => {
  const rules = parseRobots(
    "User-agent: *\nDisallow: /private\nAllow: /private/public\n", "bot",
  );

  it("blocks a disallowed prefix", () => {
    expect(isAllowed(rules, "/private/x")).toBe(false);
  });

  it("lets a longer Allow win over a shorter Disallow", () => {
    expect(isAllowed(rules, "/private/public/page")).toBe(true);
  });

  it("allows anything not mentioned", () => {
    expect(isAllowed(rules, "/services")).toBe(true);
  });

  it("supports wildcards and end-anchors", () => {
    const r = parseRobots("User-agent: *\nDisallow: /*.pdf$\n", "bot");
    expect(isAllowed(r, "/a/b.pdf")).toBe(false);
    expect(isAllowed(r, "/a/b.pdf?x=1")).toBe(true);
  });
});

describe("CachedFetch", () => {
  it("serves the second request from disk without calling out again", async () => {
    const { impl, calls } = fakeFetch({ "*": () => respond("<html>hi</html>") });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });

    const a = await http.get("https://x.com/a", { kind: "html", respectRobots: false });
    const b = await http.get("https://x.com/a", { kind: "html", respectRobots: false });

    expect(a.cacheHit).toBe(false);
    expect(b.cacheHit).toBe(true);
    expect(b.body).toBe("<html>hi</html>");
    expect(calls).toHaveLength(1);
  });

  it("does not cache a failed response", async () => {
    const { impl, calls } = fakeFetch({ "*": () => respond("nope", { status: 500 }) });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });
    await http.get("https://x.com/a", { kind: "html", respectRobots: false });
    await http.get("https://x.com/a", { kind: "html", respectRobots: false });
    expect(calls).toHaveLength(2);
  });

  it("honours robots.txt for sites that did not invite us", async () => {
    const { impl } = fakeFetch({
      "https://rival.com/robots.txt": () => respond("User-agent: *\nDisallow: /\n"),
      "*": () => respond("<html>secret</html>"),
    });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });

    const res = await http.get("https://rival.com/page", { kind: "html", respectRobots: true });
    expect(res.ok).toBe(false);
    expect(res.blockedByRobots).toBe(true);
  });

  it("reads the client's own site even when its robots.txt says no", async () => {
    // The client submitted this domain to be audited; robots.txt addresses
    // uninvited crawlers, and a great many small sites ship Disallow: /.
    const { impl } = fakeFetch({
      "https://client.com/robots.txt": () => respond("User-agent: *\nDisallow: /\n"),
      "*": () => respond("<html>ours</html>"),
    });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });

    const res = await http.get("https://client.com/page", { kind: "html", respectRobots: false });
    expect(res.ok).toBe(true);
    expect(res.body).toContain("ours");
  });

  it("treats a 403 on robots.txt as closed, having asked with an honest agent", async () => {
    const { impl, calls } = fakeFetch({
      "https://walled.com/robots.txt": () => respond("denied", { status: 403 }),
      "*": () => respond("<html/>"),
    });
    const http = new CachedFetch({
      cacheDir, fetchImpl: impl, sleepImpl: noSleep, userAgent: "WGIAuditBot/0.1",
    });

    const res = await http.get("https://walled.com/p", { kind: "html", respectRobots: true });
    expect(res.blockedByRobots).toBe(true);
    // and it identified itself rather than using a generic client
    expect(calls[0]).toBe("https://walled.com/robots.txt");
  });

  it("treats a missing robots.txt as permission", async () => {
    const { impl } = fakeFetch({
      "https://open.com/robots.txt": () => respond("nope", { status: 404 }),
      "*": () => respond("<html>ok</html>"),
    });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });
    const res = await http.get("https://open.com/p", { kind: "html", respectRobots: true });
    expect(res.ok).toBe(true);
  });

  it("fetches robots.txt once per origin", async () => {
    const { impl, calls } = fakeFetch({
      "https://a.com/robots.txt": () => respond("User-agent: *\nDisallow: /no\n"),
      "*": () => respond("<html/>"),
    });
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });
    await http.get("https://a.com/1", { kind: "html", respectRobots: true });
    await http.get("https://a.com/2", { kind: "html", respectRobots: true });
    expect(calls.filter((c) => c.endsWith("/robots.txt"))).toHaveLength(1);
  });

  it("waits between requests to the same domain", async () => {
    const waits: number[] = [];
    let clock = 0;
    const { impl } = fakeFetch({ "*": () => respond("<html/>") });
    const http = new CachedFetch({
      cacheDir, fetchImpl: impl, perDomainDelayMs: 1000,
      now: () => clock,
      sleepImpl: async (ms) => { waits.push(ms); clock += ms; },
    });
    await http.get("https://a.com/1", { kind: "html", respectRobots: false });
    await http.get("https://a.com/2", { kind: "html", respectRobots: false });
    expect(waits).toEqual([1000]);
  });

  it("does not make one domain wait for another", async () => {
    const waits: number[] = [];
    const { impl } = fakeFetch({ "*": () => respond("<html/>") });
    const http = new CachedFetch({
      cacheDir, fetchImpl: impl, perDomainDelayMs: 1000,
      now: () => 0,
      sleepImpl: async (ms) => { waits.push(ms); },
    });
    await http.get("https://a.com/1", { kind: "html", respectRobots: false });
    await http.get("https://b.com/1", { kind: "html", respectRobots: false });
    expect(waits).toEqual([]);
  });

  it("returns an error result instead of throwing when the network fails", async () => {
    const impl = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const http = new CachedFetch({ cacheDir, fetchImpl: impl, sleepImpl: noSleep });
    const res = await http.get("https://down.com/", { kind: "html", respectRobots: false });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("ECONNREFUSED");
  });

  it("sends the configured user agent", async () => {
    let seen: string | undefined;
    const impl = (async (_u: string, init?: RequestInit) => {
      seen = (init?.headers as Record<string, string>)["User-Agent"];
      return respond("<html/>");
    }) as unknown as typeof fetch;
    const http = new CachedFetch({
      cacheDir, fetchImpl: impl, sleepImpl: noSleep, userAgent: "WGIAuditBot/9 (+https://x)",
    });
    await http.get("https://a.com/", { kind: "html", respectRobots: false });
    expect(seen).toBe("WGIAuditBot/9 (+https://x)");
  });
});
