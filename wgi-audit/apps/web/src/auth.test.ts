/**
 * The lock, and the guard that stops it being left off.
 *
 * The test that earns its place here is `assertSafeToBind`: everything else
 * fails visibly when it breaks, but a dashboard that boots happily on a public
 * address with no password looks perfectly healthy right up until somebody
 * finds it.
 */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applySchema, createTestDb, type Db } from "@core/db/client.ts";
import { createLogger } from "@core/log/logger.ts";
import { createAuditRun, upsertClient } from "@core/db/queries.ts";
import {
  assertSafeToBind, authConfig, checkPassword, COOKIE, isLoopback,
  issue, LoginThrottle, readCookie, required, verify, type AuthConfig,
} from "./auth.ts";
import { createApp } from "./server.ts";

const cfg = (over: Partial<AuthConfig> = {}): AuthConfig => ({
  password: "hunter2", secret: "test-secret", secure: false, ...over,
});

// ---------------------------------------------------------------------------
describe("assertSafeToBind — the guard that matters", () => {
  it("refuses a public address with no password", () => {
    expect(() => assertSafeToBind("0.0.0.0", cfg({ password: undefined })))
      .toThrow(/DASHBOARD_PASSWORD/);
    expect(() => assertSafeToBind("192.168.1.10", cfg({ password: undefined })))
      .toThrow(/DASHBOARD_PASSWORD/);
  });

  it("allows a public address once a password is set", () => {
    expect(() => assertSafeToBind("0.0.0.0", cfg())).not.toThrow();
  });

  it("allows loopback with no password — that is the local default", () => {
    for (const host of ["127.0.0.1", "::1", "localhost"]) {
      expect(() => assertSafeToBind(host, cfg({ password: undefined })), host).not.toThrow();
    }
  });

  it("says what to do, not just that it refused", () => {
    try {
      assertSafeToBind("0.0.0.0", cfg({ password: undefined }));
      expect.unreachable();
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("DASHBOARD_PASSWORD");
      expect(message).toContain("127.0.0.1");
    }
  });

  it("does not mistake a routable address for loopback", () => {
    for (const host of ["10.0.0.1", "0.0.0.0", "::", "127.0.0.1.evil.test"]) {
      expect(isLoopback(host), host).toBe(false);
    }
  });
});

describe("authConfig", () => {
  it("requires no login when no password is set", () => {
    expect(required(authConfig({} as NodeJS.ProcessEnv))).toBe(false);
  });

  it("requires a login as soon as one is", () => {
    expect(required(authConfig({ DASHBOARD_PASSWORD: "x" } as NodeJS.ProcessEnv))).toBe(true);
  });

  it("ignores a password that is only whitespace", () => {
    expect(required(authConfig({ DASHBOARD_PASSWORD: "   " } as NodeJS.ProcessEnv))).toBe(false);
  });
});

describe("sessions", () => {
  it("accepts a token it just issued", () => {
    const c = cfg();
    expect(verify(issue(c), c)).toBe(true);
  });

  it("rejects one signed with a different secret", () => {
    expect(verify(issue(cfg()), cfg({ secret: "other" }))).toBe(false);
  });

  it("rejects an expired token", () => {
    const c = cfg();
    const token = issue(c, 0);
    expect(verify(token, c, 0)).toBe(true);
    expect(verify(token, c, 1000 * 60 * 60 * 24)).toBe(false);
  });

  it("rejects a tampered expiry — the signature covers it", () => {
    const c = cfg();
    const far = String(Date.now() + 10 ** 10);
    const forged = `${far}.${issue(c).split(".")[1]}`;
    expect(verify(forged, c)).toBe(false);
  });

  it("rejects nonsense without throwing", () => {
    const c = cfg();
    for (const bad of [undefined, "", ".", "abc", "abc.def", "1.2.3"]) {
      expect(verify(bad, c), String(bad)).toBe(false);
    }
  });

  /** Changing the password must end every session that used the old one. */
  it("invalidates sessions when the password becomes the secret and changes", () => {
    const before = authConfig({ DASHBOARD_PASSWORD: "old" } as NodeJS.ProcessEnv);
    const after = authConfig({ DASHBOARD_PASSWORD: "new" } as NodeJS.ProcessEnv);
    expect(verify(issue(before), after)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("accepts the right one and rejects everything else", () => {
    const c = cfg();
    expect(checkPassword("hunter2", c)).toBe(true);
    for (const wrong of ["", "hunter", "hunter22", "HUNTER2"]) {
      expect(checkPassword(wrong, c), wrong).toBe(false);
    }
  });

  it("rejects everything when no password is configured", () => {
    expect(checkPassword("", cfg({ password: undefined }))).toBe(false);
    expect(checkPassword("anything", cfg({ password: undefined }))).toBe(false);
  });
});

describe("LoginThrottle", () => {
  it("blocks after the limit and lets a different address through", () => {
    const t = new LoginThrottle(3, 1000);
    for (let i = 0; i < 3; i++) t.fail("a");
    expect(t.blocked("a")).toBe(true);
    expect(t.blocked("b")).toBe(false);
  });

  it("forgets once the lockout passes", () => {
    const t = new LoginThrottle(1, 1000);
    t.fail("a", 0);
    expect(t.blocked("a", 500)).toBe(true);
    expect(t.blocked("a", 2000)).toBe(false);
  });

  it("clears the count on a success", () => {
    const t = new LoginThrottle(2, 1000);
    t.fail("a");
    t.succeed("a");
    t.fail("a");
    expect(t.blocked("a")).toBe(false);
  });
});

describe("readCookie", () => {
  const req = (cookie?: string) =>
    ({ headers: cookie === undefined ? {} : { cookie } }) as never;

  it("finds one among several", () => {
    expect(readCookie(req(`a=1; ${COOKIE}=abc; b=2`), COOKIE)).toBe("abc");
  });
  it("returns undefined when absent", () => {
    expect(readCookie(req("a=1"), COOKIE)).toBeUndefined();
    expect(readCookie(req(), COOKIE)).toBeUndefined();
  });
  it("does not match a cookie whose name merely ends the same way", () => {
    expect(readCookie(req(`not_${COOKIE}=abc`), COOKIE)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// over real HTTP, with the gate on
// ---------------------------------------------------------------------------
describe("the gate, end to end", () => {
  let db: Db;
  let server: Server;
  let base: string;
  let runId: string;

  beforeAll(async () => {
    db = await createTestDb();
    await applySchema(db);
    const client = await upsertClient(db, {
      domain: "secret.test", areaScope: "province", areas: ["ภูเก็ต"],
    });
    runId = (await createAuditRun(db, client.id)).id;

    server = createApp({
      db, log: createLogger({ level: "error" }), auth: cfg(),
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  });

  const get = (path: string, cookie?: string) =>
    fetch(base + path, {
      redirect: "manual", headers: cookie ? { cookie } : {},
    });

  const login = async (password: string) =>
    fetch(base + "/login", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password }).toString(),
    });

  it("sends an anonymous visitor to the login page, showing no data", async () => {
    for (const path of ["/", `/audits/${runId}`, `/audits/${runId}/report`]) {
      const res = await get(path);
      expect(res.status, path).toBe(303);
      expect(res.headers.get("location"), path).toBe("/login");
      expect(await res.text(), path).not.toContain("secret.test");
    }
  });

  it("401s the JSON endpoints rather than redirecting a fetch to HTML", async () => {
    const res = await get(`/api/audits/${runId}`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("refuses to start an audit for an anonymous visitor", async () => {
    const before = await db.query(`select id from audit_runs`);
    const res = await fetch(base + "/audits", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ domain: "intruder.test", area: "ภูเก็ต" }).toString(),
    });
    expect(res.headers.get("location")).toBe("/login");
    expect(await db.query(`select id from audit_runs`)).toHaveLength(before.length);
  });

  it("still answers /healthz, which a load balancer needs", async () => {
    expect((await get("/healthz")).status).toBe(200);
  });

  it("serves the login form itself", async () => {
    const res = await get("/login");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('type="password"');
  });

  it("lets the right password in and keeps the wrong one out", async () => {
    expect((await login("wrong")).headers.get("location")).toContain("error=");

    const ok = await login("hunter2");
    expect(ok.headers.get("location")).toBe("/");
    const cookie = ok.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");

    const session = cookie.split(";")[0]!;
    const dash = await get("/", session);
    expect(dash.status).toBe(200);
    expect(await dash.text()).toContain("secret.test");
  });

  it("stops honouring the cookie after logout", async () => {
    const ok = await login("hunter2");
    const session = (ok.headers.get("set-cookie") ?? "").split(";")[0]!;
    expect((await get("/", session)).status).toBe(200);

    const out = await fetch(base + "/logout", { redirect: "manual", headers: { cookie: session } });
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("ignores a forged cookie", async () => {
    const res = await get("/", `${COOKIE}=${Date.now() + 999999}.deadbeef`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login");
  });
});
