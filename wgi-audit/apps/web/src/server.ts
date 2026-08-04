/**
 * `pnpm dash` — the operator's dashboard.
 *
 * A plain Node HTTP server rendering HTML. No React, no Next.js, no bundler,
 * no build step, and no dependency this repo did not already have.
 *
 * ## Why not Next.js, which the spec named
 *
 * The spec put a Next.js app at M6, for the *public* site: an intake form
 * strangers fill in, registration, share links. That is still the right tool
 * for that job and this does not replace it.
 *
 * This is a different thing — one operator, on their own machine, needing to
 * run an audit and read the result. For that, a build step is pure cost: it is
 * one more thing to install, to keep current, and to go wrong on a Windows
 * laptop on the morning of a client meeting. Server-rendered HTML has none of
 * those failure modes and prints to PDF natively, which is how the report
 * actually reaches a customer.
 *
 * ## The worker runs in here too
 *
 * By default this process also polls the `jobs` table, so `pnpm dash` is the
 * only command needed. The queue path is unchanged — the dashboard enqueues
 * exactly like `pnpm audit --queue` does, so there is still one way an audit
 * starts. Pass `--no-worker` to run them apart.
 *
 * ## It binds to localhost
 *
 * This page has no authentication and shows every client's data. Binding to
 * 127.0.0.1 is what keeps that safe, and it is deliberate rather than a
 * default — see the note on HOST below.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { applySchema, createDb, type Db } from "@core/db/client.ts";
import { createAuditRun, enqueueJob, upsertClient } from "@core/db/queries.ts";
import { createLogger, type Logger } from "@core/log/logger.ts";
import { AreaScope } from "@core/types/index.ts";
import { normaliseDomain } from "@core/crawl/domain.ts";
// The one cross-app import: the dashboard runs the worker's own loop rather
// than a second copy of it, so a job behaves the same whoever picked it up.
import { tick } from "../../worker/src/index.ts";

import {
  assertSafeToBind, authConfig, callerKey, checkPassword, clearSessionCookie,
  isAuthed, issue, LoginThrottle, required, setSessionCookie, type AuthConfig,
} from "./auth.ts";
import { getAuditDetail, listAudits } from "./queries.ts";
import { dashboardPage, loginPage, reportPage, runPage } from "./view/pages.ts";
import { esc, page } from "./view/components.ts";
import { thWeb } from "./view/text.ts";
import { isEntryPoint } from "@core/entry.ts";

const PORT = Number(process.env.WEB_PORT ?? 4321);

/**
 * Localhost unless someone deliberately says otherwise. There is no login on
 * this dashboard; exposing it on 0.0.0.0 publishes every audit to the network.
 */
const HOST = process.env.WEB_HOST ?? "127.0.0.1";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 3000);

export interface ServerOptions {
  db: Db;
  log: Logger;
  /** Poll the jobs table in this process. */
  worker?: boolean;
  auth?: AuthConfig;
  /** Read the client address from `x-forwarded-for`. Only behind a proxy. */
  trustProxy?: boolean;
}

export function createApp(opts: ServerOptions) {
  const { db, log } = opts;
  const auth = opts.auth ?? authConfig();
  const throttle = new LoginThrottle();
  const trustProxy = opts.trustProxy ?? process.env.WEB_TRUST_PROXY === "1";

  return createServer((req, res) => {
    handle(req, res, { db, log, auth, throttle, trustProxy }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      log.error("request failed", { url: req.url, error: message });
      if (!res.headersSent) send(res, 500, errorPage("500", message));
    });
  });
}

interface Ctx {
  db: Db;
  log: Logger;
  auth: AuthConfig;
  throttle: LoginThrottle;
  trustProxy: boolean;
}

async function handle(req: IncomingMessage, res: ServerResponse, ctx: Ctx): Promise<void> {
  const { db, log, auth } = ctx;
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  // Deliberately before the auth gate: a health check must answer for a load
  // balancer, and it reveals nothing but that the process is alive.
  if (path === "/healthz") return sendJson(res, 200, { ok: true });

  // -- login ----------------------------------------------------------------
  if (path === "/login" && method === "GET") {
    if (!required(auth) || isAuthed(req, auth)) return redirect(res, "/");
    return send(res, 200, loginPage(url.searchParams.get("error") ?? undefined));
  }

  if (path === "/login" && method === "POST") {
    if (!required(auth)) return redirect(res, "/");
    const who = callerKey(req, ctx.trustProxy);

    if (ctx.throttle.blocked(who)) {
      log.warn("login throttled", { who });
      return redirect(res, `/login?error=${encodeURIComponent(thWeb.login.throttled)}`);
    }

    const form = new URLSearchParams(await readBody(req));
    if (!checkPassword(form.get("password") ?? "", auth)) {
      ctx.throttle.fail(who);
      log.warn("login failed", { who });
      return redirect(res, `/login?error=${encodeURIComponent(thWeb.login.wrong)}`);
    }

    ctx.throttle.succeed(who);
    setSessionCookie(res, issue(auth), auth);
    log.info("login ok", { who });
    return redirect(res, "/");
  }

  if (path === "/logout") {
    clearSessionCookie(res);
    return redirect(res, "/login");
  }

  // -- everything past here needs a session ---------------------------------
  if (!isAuthed(req, auth)) {
    if (path.startsWith("/api/")) return sendJson(res, 401, { error: "unauthorized" });
    return redirect(res, "/login");
  }

  // -- start an audit -------------------------------------------------------
  if (path === "/audits" && method === "POST") {
    const form = new URLSearchParams(await readBody(req));
    const domain = normaliseDomain(form.get("domain") ?? "");
    const area = (form.get("area") ?? "").trim();
    const scope = AreaScope.safeParse(form.get("scope") ?? "province");
    const areaScope = scope.success ? scope.data : "province";

    if (!domain) return redirect(res, `/?error=${encodeURIComponent(thWeb.form.errorDomain)}`);
    if (!area && areaScope !== "nationwide") {
      return redirect(res, `/?error=${encodeURIComponent(thWeb.form.errorArea)}`);
    }

    const client = await upsertClient(db, {
      domain,
      areaScope,
      areas: area ? area.split(",").map((s) => s.trim()).filter(Boolean) : [],
      leadSource: "dashboard",
    });
    const run = await createAuditRun(db, client.id);
    await enqueueJob(db, run.id);
    log.info("queued from dashboard", { domain, runId: run.id });
    return redirect(res, `/audits/${run.id}`);
  }

  if (method !== "GET") return send(res, 405, errorPage("405", "method not allowed"));

  // -- dashboard ------------------------------------------------------------
  if (path === "/") {
    const audits = await listAudits(db);
    return send(res, 200, dashboardPage(
      audits, url.searchParams.get("error") ?? undefined, required(auth),
    ));
  }

  // -- polling --------------------------------------------------------------
  if (path === "/api/audits") {
    const audits = await listAudits(db, 50);
    // One key covering every run, so the list reloads when any of them moves.
    return sendJson(res, 200, {
      status: audits.map((a) => a.status).join(","),
      stage: audits.map((a) => a.stage ?? "").join(","),
    });
  }

  const api = /^\/api\/audits\/([0-9a-f-]{36})$/i.exec(path);
  if (api) {
    const audit = await getAuditDetail(db, api[1]!);
    if (!audit) return sendJson(res, 404, { error: "not found" });
    return sendJson(res, 200, {
      status: audit.status, stage: audit.stage,
      overall: audit.overall, findings: audit.findingsTotal,
    });
  }

  // -- one audit ------------------------------------------------------------
  const view = /^\/audits\/([0-9a-f-]{36})(\/report)?$/i.exec(path);
  if (view) {
    const audit = await getAuditDetail(db, view[1]!);
    if (!audit) return send(res, 404, errorPage("404", "ไม่พบงานตรวจนี้"));
    return send(res, 200, view[2] ? reportPage(audit) : runPage(audit));
  }

  return send(res, 404, errorPage("404", "ไม่พบหน้านี้"));
}

// ---------------------------------------------------------------------------
// http helpers
// ---------------------------------------------------------------------------
function send(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    // No third-party anything on this page, so the strictest policy fits.
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  res.end(html);
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function redirect(res: ServerResponse, location: string): void {
  // 303 so a refresh after submitting does not re-submit the form.
  res.writeHead(303, { location, "cache-control": "no-store" });
  res.end();
}

/** Bounded: a form post to this endpoint is a few hundred bytes. */
async function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > limit) throw new Error("request body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function errorPage(code: string, message: string): string {
  return page(
    { title: `${code} — ${thWeb.app}`, narrow: true },
    `<div class="empty"><h1 style="font-size:38px;margin:0 0 6px">${esc(code)}</h1>
<p>${esc(message)}</p><p><a href="/">${esc(thWeb.nav.back)}</a></p></div>`,
  );
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export async function start(argv = process.argv.slice(2)): Promise<void> {
  const withWorker = !argv.includes("--no-worker");
  const auth = authConfig();

  // Before opening a socket or touching the database: an open dashboard on a
  // public address must never reach the point of serving its first request.
  assertSafeToBind(HOST, auth);

  const log = createLogger({ stage: "web" });
  const db = await createDb();
  await applySchema(db);

  const server = createApp({ db, log, worker: withWorker, auth });

  await new Promise<void>((resolve) => server.listen(PORT, HOST, resolve));
  log.info("dashboard ready", {
    url: `http://${HOST}:${PORT}`, driver: db.driver,
    worker: withWorker, login: required(auth),
  });

  let stopping = false;
  if (withWorker) void pollLoop(db, log.child({ stage: "worker" }), () => stopping);

  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => void db.close().then(() => process.exit(0)));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

/** Drain the queue, then sleep. Same `tick` the standalone worker uses. */
async function pollLoop(db: Db, log: Logger, stopping: () => boolean): Promise<void> {
  while (!stopping()) {
    try {
      let worked = true;
      while (worked && !stopping()) worked = await tick(db, log);
    } catch (err) {
      log.error("poll failed", { error: err instanceof Error ? err.message : String(err) });
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

if (isEntryPoint(import.meta.url)) {
  start().catch((err: unknown) => {
    process.stderr.write(String(err instanceof Error ? err.stack : err) + "\n");
    process.exit(1);
  });
}
