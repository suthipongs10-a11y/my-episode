/**
 * 01 — Intake.
 *
 * Settle what we are auditing before spending anything: follow redirects to the
 * URL the site actually serves, and stop immediately if it is not online. A run
 * that discovers on stage 7 that the domain was mistyped has already spent
 * money on the six before it.
 *
 * The same stage is the readability gate (crawl/gate.ts). A bot wall that
 * answers 200 with its own page, or a JavaScript shell with no text in it, is
 * "online" by status code and unauditable by content — and a run that scored
 * either would report confident findings about a page nobody saw. It stops
 * here, with the reason in the run's error, before anything is stored as fact.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { th } from "../i18n/th.ts";
import { detectChallenge, looksUnrendered } from "../crawl/gate.ts";
import { extractPage } from "../crawl/extract.ts";

export interface IntakeResult {
  domain: string;
  baseUrl: string;
  https: boolean;
  statusCode: number;
  redirectedTo: string | null;
}

export const intakeStage: PipelineStage = {
  name: "01-intake",
  async run(ctx: StageContext) {
    const { client, http, log } = ctx;
    const result = ctx.dryRun
      ? dryResult(client.domain)
      : await probe(ctx);

    ctx.state.set("intake", result);
    await saveSnapshot(ctx.db, ctx.run.id, "site", result.domain, result);
    log.info("site is reachable", {
      baseUrl: result.baseUrl, status: result.statusCode,
      ...(result.redirectedTo ? { redirectedTo: result.redirectedTo } : {}),
    });
  },
};

async function probe(ctx: StageContext): Promise<IntakeResult> {
  const domain = ctx.client.domain;
  // https first: almost every live site serves it, and starting there avoids
  // a redirect hop on the common case.
  for (const scheme of ["https", "http"] as const) {
    const url = `${scheme}://${domain}/`;
    // The client asked us to audit this site, so robots.txt does not gate it.
    const res = await ctx.http.get(url, { kind: "html", respectRobots: false });

    // A wall answers for the site. Stop rather than fall through to "offline",
    // which would be the wrong diagnosis and the wrong next step.
    const wall = detectChallenge(res.body ?? "", res.headers ?? {}, res.status);
    if (wall) {
      ctx.log.warn("bot wall answered instead of the site", {
        vendor: wall.vendor, evidence: wall.evidence, status: res.status, url,
      });
      throw new Error(`${th.intake.blocked(wall.vendor)} (${domain})`);
    }
    if (!res.ok) continue;

    const finalUrl = new URL(res.finalUrl || url);
    const finalHost = finalUrl.host.replace(/^www\./, "");
    const redirectedTo = finalHost === domain ? null : finalHost;
    if (redirectedTo) ctx.log.warn(th.intake.redirected, { from: domain, to: redirectedTo });

    // The homepage must carry something to read before anything is scored.
    const home = extractPage(finalUrl.toString(), res.body, { domain, statusCode: res.status });
    const shell = looksUnrendered(res.body, home);
    if (shell) {
      ctx.log.warn("homepage has nothing to read", {
        kind: shell.kind, evidence: shell.evidence, words: home.wordCount, links: home.internalLinks,
      });
      const why = shell.kind === "shell" ? th.intake.unrendered : th.intake.empty(home.wordCount);
      throw new Error(`${why} (${domain})`);
    }

    return {
      domain,
      baseUrl: finalUrl.origin + "/",
      https: finalUrl.protocol === "https:",
      statusCode: res.status,
      redirectedTo,
    };
  }
  throw new Error(`${th.intake.offline} (${domain})`);
}

function dryResult(domain: string): IntakeResult {
  return {
    domain, baseUrl: `https://${domain}/`, https: true,
    statusCode: 0, redirectedTo: null,
  };
}
