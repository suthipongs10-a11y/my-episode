/**
 * The lock on the dashboard.
 *
 * One shared password, because there is one operator. Adding accounts, roles
 * and a password-reset flow would be building a product nobody asked for; a
 * single secret in the environment is the honest size of this problem.
 *
 * ## The rule that matters
 *
 * The dashboard shows every client's audit. Two states are safe:
 *
 *   - bound to loopback, no password — your own machine, nobody else can reach it
 *   - reachable from the network, password set — anyone who reaches it must know it
 *
 * The third combination — reachable *and* open — is the one that quietly
 * publishes a customer list, so `assertSafeToBind` refuses to start the server
 * in that state. A deployment that fails loudly on the first boot is cheap; a
 * deployment that works and is open is not discovered until it matters.
 *
 * ## Sessions
 *
 * A cookie carrying an expiry and an HMAC of it. No session table, no store to
 * expire, and a stolen cookie dies on its own. The secret comes from
 * `SESSION_SECRET` when set, and otherwise from the password — which means
 * changing the password invalidates every session, which is what you want from
 * the only credential in the system.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const COOKIE = "wgi_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

/** Wrong guesses allowed per address before it has to wait. */
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface AuthConfig {
  /** Unset means no login is required — only legal on loopback. */
  password?: string;
  secret: string;
  /** Set the Secure flag; false when serving plain http on localhost. */
  secure: boolean;
}

export function authConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const password = env.DASHBOARD_PASSWORD?.trim();
  return {
    ...(password ? { password } : {}),
    // Random when neither is set: sessions do not survive a restart, which is
    // harmless because there is nothing to log in to either.
    secret: env.SESSION_SECRET?.trim() || password || randomBytes(32).toString("hex"),
    secure: env.WEB_SECURE_COOKIE === "1",
  };
}

export function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

/**
 * Refuse to serve a passwordless dashboard to anything but this machine.
 *
 * Throws rather than warning. A warning in a startup log is read once, by
 * nobody, and the operator finds out what it meant later.
 */
export function assertSafeToBind(host: string, cfg: AuthConfig): void {
  if (cfg.password || isLoopback(host)) return;
  throw new Error(
    `ปฏิเสธการเปิดเซิร์ฟเวอร์: WEB_HOST=${host} เข้าถึงได้จากเครือข่าย ` +
    `แต่ยังไม่ได้ตั้ง DASHBOARD_PASSWORD\n` +
    `หน้านี้มีข้อมูลลูกค้าทุกราย — ตั้งรหัสผ่านก่อน หรือใช้ WEB_HOST=127.0.0.1`,
  );
}

export function required(cfg: AuthConfig): boolean {
  return Boolean(cfg.password);
}

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function issue(cfg: AuthConfig, now = Date.now()): string {
  const expires = String(now + MAX_AGE_SECONDS * 1000);
  return `${expires}.${sign(expires, cfg.secret)}`;
}

export function verify(token: string | undefined, cfg: AuthConfig, now = Date.now()): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;

  const expires = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!equal(mac, sign(expires, cfg.secret))) return false;

  const at = Number(expires);
  return Number.isFinite(at) && at > now;
}

/** Constant-time compare that does not leak length through an exception. */
function equal(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkPassword(input: string, cfg: AuthConfig): boolean {
  if (!cfg.password) return false;
  // Compare digests so the comparison length never depends on the secret.
  return equal(sign(input, cfg.secret), sign(cfg.password, cfg.secret));
}

// ---------------------------------------------------------------------------
// cookies
// ---------------------------------------------------------------------------
export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function setSessionCookie(res: ServerResponse, token: string, cfg: AuthConfig): void {
  res.setHeader("set-cookie", [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",          // the app is one origin; nothing needs cross-site
    `Max-Age=${MAX_AGE_SECONDS}`,
    ...(cfg.secure ? ["Secure"] : []),
  ].join("; "));
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("set-cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

export function isAuthed(req: IncomingMessage, cfg: AuthConfig): boolean {
  if (!required(cfg)) return true;
  return verify(readCookie(req, COOKIE), cfg);
}

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------
/**
 * Wrong guesses, counted per address.
 *
 * In memory on purpose: a restart clears it, which is a real weakness against
 * someone who can restart the process — but they already have the machine. It
 * exists to make an online guessing attack slow, not to be a security boundary.
 */
export class LoginThrottle {
  private readonly hits = new Map<string, { count: number; until: number }>();

  constructor(
    private readonly max = MAX_ATTEMPTS,
    private readonly lockoutMs = LOCKOUT_MS,
  ) {}

  blocked(key: string, now = Date.now()): boolean {
    const hit = this.hits.get(key);
    if (!hit) return false;
    if (hit.until <= now) {
      this.hits.delete(key);
      return false;
    }
    return hit.count >= this.max;
  }

  fail(key: string, now = Date.now()): void {
    const hit = this.hits.get(key);
    this.hits.set(key, {
      count: (hit && hit.until > now ? hit.count : 0) + 1,
      until: now + this.lockoutMs,
    });
  }

  succeed(key: string): void {
    this.hits.delete(key);
  }
}

/** Who is asking. Behind a proxy that is the forwarded address. */
export function callerKey(req: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? "unknown";
}
