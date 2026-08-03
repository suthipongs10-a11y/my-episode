/**
 * 01 — Intake.
 *
 * Settle what we are auditing before spending anything: follow redirects to the
 * URL the site actually serves, and stop immediately if it is not online. A run
 * that discovers on stage 7 that the domain was mistyped has already spent
 * money on the six before it.
 */
import type { PipelineStage, StageContext } from "./runner.ts";
import { saveSnapshot } from "../db/queries.ts";
import { th } from "../i18n/th.ts";

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
    if (!res.ok) continue;

    const finalUrl = new URL(res.finalUrl || url);
    const finalHost = finalUrl.host.replace(/^www\./, "");
    const redirectedTo = finalHost === domain ? null : finalHost;
    if (redirectedTo) ctx.log.warn(th.intake.redirected, { from: domain, to: redirectedTo });

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
