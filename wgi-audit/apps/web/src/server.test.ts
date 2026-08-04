/**
 * The dashboard, end to end over real HTTP against a real database.
 *
 * No browser and no network: the server is started on a random port, PGlite
 * holds the data, and the assertions are made against the HTML that comes back.
 * Rendering is a pure function of the row, so checking the string is checking
 * the page.
 *
 * The two groups that matter most are the last two: escaping, because a domain
 * arrives from a form field and lands in the page; and the client report,
 * because that document goes to somebody who is not us.
 */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applySchema, createTestDb, type Db } from "@core/db/client.ts";
import { createLogger } from "@core/log/logger.ts";
import {
  createAuditRun, saveFindings, saveSnapshot, upsertClient,
} from "@core/db/queries.ts";
import { createApp } from "./server.ts";
import { esc } from "./view/components.ts";
import { verdictFor } from "./view/pages.ts";

let db: Db;
let server: Server;
let base: string;
let runId: string;

const SCORES = {
  scoring_version: 2,
  scores: {
    overall: 35, conversion: 0, local: 50, content: 50,
    visibility: 50, onpage: 33, technical: 40,
  },
  // Nothing beyond the crawl was collected — the common case with no vendor keys.
  inputs: {
    has_gbp_data: false, has_visibility_data: false, has_competitor_data: false,
    pages_fetched: 3,
  },
};

beforeAll(async () => {
  db = await createTestDb();
  await applySchema(db);

  const client = await upsertClient(db, {
    domain: "example.test", areaScope: "province", areas: ["ภูเก็ต"],
  });
  const run = await createAuditRun(db, client.id);
  runId = run.id;

  await db.query(
    `update audit_runs set status = 'done', stage = '12-scoring',
        started_at = now(), finished_at = now(), cost_thb = 0 where id = $1`,
    [runId],
  );
  await saveSnapshot(db, runId, "site", "scores", SCORES);
  await saveFindings(db, runId, [
    {
      code: "CVR-001", category: "conversion", severity: "critical",
      evidence: { pages_without_tel_link: 3 },
      affectedUrls: ["https://example.test/"], effortHours: 1, impactScore: 10,
    },
    {
      code: "ONP-003", category: "onpage", severity: "medium",
      evidence: { too_long: 2 }, effortHours: 2, impactScore: 4,
    },
  ]);

  server = createApp({ db, log: createLogger({ level: "error" }) });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await db.close();
});

const get = (path: string) => fetch(base + path, { redirect: "manual" });
const text = async (path: string) => (await get(path)).text();

// ---------------------------------------------------------------------------
describe("routing", () => {
  it("serves the dashboard", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("example.test");
  });

  it("answers /healthz without touching the database", async () => {
    expect((await get("/healthz")).status).toBe(200);
  });

  it("404s an unknown path and an unknown run", async () => {
    expect((await get("/nope")).status).toBe(404);
    expect((await get("/audits/00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });

  it("rejects a non-GET on a page route rather than rendering it", async () => {
    expect((await fetch(base + "/", { method: "DELETE" })).status).toBe(405);
  });

  it("reports status as JSON for the poller", async () => {
    const res = await get(`/api/audits/${runId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "done", stage: "12-scoring", overall: 35, findings: 2,
    });
  });
});

describe("starting an audit", () => {
  const post = (body: Record<string, string>) =>
    fetch(base + "/audits", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

  it("creates a run, enqueues a job, and redirects to it", async () => {
    const res = await post({ domain: "https://new-site.test/pricing", area: "เชียงใหม่" });
    expect(res.status).toBe(303);
    const location = res.headers.get("location") ?? "";
    expect(location).toMatch(/^\/audits\/[0-9a-f-]{36}$/);

    // The domain was normalised, not stored as typed.
    const client = await db.one<{ domain: string; areas: string[] }>(
      `select domain, areas from clients where domain = 'new-site.test'`,
    );
    expect(client?.domain).toBe("new-site.test");
    expect(client?.areas).toEqual(["เชียงใหม่"]);

    // It goes through the same queue the CLI uses — one way an audit starts.
    const id = location.split("/").pop()!;
    const job = await db.one<{ status: string }>(
      `select status from jobs where audit_run_id = $1`, [id],
    );
    expect(job?.status).toBe("pending");
  });

  it("refuses a missing domain instead of creating an empty client", async () => {
    const before = await db.query(`select id from clients`);
    const res = await post({ domain: "", area: "ภูเก็ต" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=");
    expect(await db.query(`select id from clients`)).toHaveLength(before.length);
  });

  it("refuses a local business with no area, but allows nationwide", async () => {
    expect((await post({ domain: "a.test", area: "", scope: "province" }))
      .headers.get("location")).toContain("error=");
    expect((await post({ domain: "b.test", area: "", scope: "nationwide" }))
      .headers.get("location")).toMatch(/^\/audits\//);
  });

  it("falls back to province rather than trusting an unknown scope", async () => {
    await post({ domain: "c.test", area: "ภูเก็ต", scope: "'; drop table clients; --" });
    const client = await db.one<{ area_scope: string }>(
      `select area_scope from clients where domain = 'c.test'`,
    );
    expect(client?.area_scope).toBe("province");
    // And the table is still there.
    expect((await db.query(`select id from clients`)).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe("the run page", () => {
  it("shows the score, the verdict and the findings", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("35");
    expect(html).toContain(verdictFor(35));
    expect(html).toContain("คนโทรหาคุณไม่ได้จากมือถือ");   // CVR-001 title
    expect(html).toContain("CVR-001");                      // the code, for us
  });

  it("shows the evidence behind every finding", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("pages_without_tel_link");
  });

  /**
   * The reason scoring v2 exists, enforced at the last place it could still go
   * wrong. local/content/visibility are 50 in the snapshot because nobody
   * measured them; painting that as a score would tell the owner they failed
   * something we never looked at.
   */
  it("marks an unmeasured category as unmeasured, never as a score of 50", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("ยังไม่ได้วัด");
    expect(html).toContain("ต้องต่อ DataForSEO ก่อน");
    expect(html).toContain("unmeasured");

    // The measured ones still render a real bar.
    expect(html).toContain("width:33%");
    expect(html).toContain("width:40%");
    // …and no bar is drawn for a category with no data.
    expect(html).not.toContain("width:50%");
  });

  it("says plainly that a run with no paid API cost nothing", async () => {
    expect(await text(`/audits/${runId}`)).toContain("ไม่มีค่าใช้จ่าย");
  });

  /**
   * The overall score is an average over measured categories only, so the
   * page has to say how much of the picture that was. Without it, 79 across
   * 40% coverage reads exactly like 79 across all of it.
   */
  it("states what fraction of the scoring weight was measured", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("coverage-fill");
    expect(html).toContain("40%");
    expect(html).toContain("ของน้ำหนัก");
  });

  it("charts the findings by category, with a legend and no colour-only meaning", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("ปัญหาอยู่ตรงไหนบ้าง");
    expect(html).toContain("stack-bar");
    // Every severity in the chart is named in the legend, not just coloured.
    for (const label of ["วิกฤต", "สูง", "กลาง", "ต่ำ"]) {
      expect(html, label).toContain(`class="key-dot"`);
      expect(html, label).toContain(label);
    }
  });

  it("shows total effort and page count, so a job can be quoted", async () => {
    const html = await text(`/audits/${runId}`);
    expect(html).toContain("ชั่วโมงงานรวม");
    expect(html).toContain("จำนวนหน้า");
  });
});

// ---------------------------------------------------------------------------
describe("the client report", () => {
  it("keeps the finding titles and the fixes", async () => {
    const html = await text(`/audits/${runId}/report`);
    expect(html).toContain("คนโทรหาคุณไม่ได้จากมือถือ");
    expect(html).toContain("ทำเบอร์โทรให้เป็นปุ่มกดโทรออกได้ทันที");
  });

  /**
   * Everything the owner does not need is absent, not merely hidden with CSS.
   * A rule code, a JSON blob or our API spend on the page a customer reads is
   * an invitation to stop reading — and the cost line is nobody's business but
   * ours.
   */
  it("carries no rule codes, no raw evidence and no cost", async () => {
    const html = await text(`/audits/${runId}/report`);
    expect(html).not.toContain("CVR-001");
    expect(html).not.toContain("pages_without_tel_link");
    expect(html).not.toContain("ต้นทุนของงานนี้");
  });

  it("hides categories nobody measured rather than showing an empty bar", async () => {
    const html = await text(`/audits/${runId}/report`);
    expect(html).toContain("โครงสร้างหน้าเว็บ");   // measured — shown
    // Unmeasured rows are absent entirely: no hatched track and no apology for
    // missing data. Explaining our own tooling gaps is the operator page's job.
    // (The class name itself is in the inlined stylesheet — check the markup.)
    expect(html).not.toContain('class="meter-row unmeasured"');
    expect(html).not.toContain("ยังไม่ได้วัด");
    expect(html).not.toContain("ต้องต่อ DataForSEO ก่อน");
    // Exactly the three measured categories get a bar. Matching the opening
    // attribute, not the bare class name, which also appears in the stylesheet.
    expect(html.match(/class="meter-row"/g) ?? []).toHaveLength(3);
  });

  it("states that it is not a guarantee, which project rule 7 requires", async () => {
    const html = await text(`/audits/${runId}/report`);
    expect(html).toContain("ไม่ใช่การรับประกันอันดับ");
    for (const forbidden of ["รับประกันว่า", "การันตี", "ติดหน้าแรกแน่นอน"]) {
      expect(html, forbidden).not.toContain(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------
describe("escaping — the one place untrusted text meets the page", () => {
  it("escapes the characters that would break out of HTML", () => {
    expect(esc(`<script>alert("x")</script>`))
      .toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(esc("a & b")).toBe("a &amp; b");
    expect(esc("it's")).toBe("it&#39;s");
  });

  it("renders null and undefined as nothing, not as the word", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });

  /**
   * The area is free text from the form and it *is* rendered, in the list and
   * in the run page's header — so it is the field that has to survive being
   * hostile. Asserting on the escaped form as well as the raw one: "not
   * present" would also pass if the value were silently dropped.
   */
  it("does not emit a raw tag from a hostile area name", async () => {
    const hostile = await upsertClient(db, {
      domain: "evil.test", areaScope: "province",
      areas: ["<img src=x onerror=alert(1)>"],
    });
    // The list is a join — a client with no run never reaches the page.
    await createAuditRun(db, hostile.id);
    const html = await text("/");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("headers", () => {
  it("sends a content security policy and forbids sniffing", async () => {
    const res = await get("/");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("asks search engines not to index an operator page", async () => {
    expect(await text("/")).toContain('name="robots" content="noindex, nofollow"');
  });
});

describe("verdictFor", () => {
  it("gets harsher as the score falls", () => {
    const bands = [90, 60, 40, 10].map(verdictFor);
    expect(new Set(bands).size).toBe(4);
  });
});
