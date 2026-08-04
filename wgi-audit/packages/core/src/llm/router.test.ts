/**
 * The router, with no model anywhere near it.
 *
 * The test that matters most here is the last group: project rule #1 says the
 * model may never produce a number that reaches a report, and the enforcement
 * is the zod schema rather than a sentence in a prompt. These tests hand the
 * router a model that ignores the prompt entirely and confirm the numbers still
 * do not get through.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { CachedFetch } from "../http/cached-fetch.ts";
import { createLogger } from "../log/logger.ts";
import { resetEnv } from "../env.ts";
import { LlmRouter, loadPrompt, stripFence } from "./router.ts";

let cacheDir: string;
const log = createLogger({ level: "error" });

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "wgi-llm-"));
  process.env.LLM_BASE_URL = "https://llm.test/v1";
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_MODEL_CHEAP = "test-cheap";
  process.env.LLM_MODEL_SMART = "test-smart";
  resetEnv();
});

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
  delete process.env.LLM_BASE_URL;
  delete process.env.LLM_API_KEY;
  delete process.env.LLM_MODEL_CHEAP;
  delete process.env.LLM_MODEL_SMART;
  resetEnv();
});

/** A fake model that replies with the given contents, in order. */
function fakeModel(...replies: string[]) {
  const bodies: string[] = [];
  let i = 0;
  const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ""));
    const content = replies[Math.min(i++, replies.length - 1)] ?? "";
    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as unknown as typeof fetch;
  return { impl, bodies, calls: () => i };
}

function router(fetchImpl: typeof fetch, dryRun = false) {
  const http = new CachedFetch({
    cacheDir, fetchImpl, sleepImpl: async () => {}, perDomainDelayMs: 0,
  });
  return new LlmRouter(http, log, dryRun);
}

const Answer = z.object({ label: z.string() });

describe("availability", () => {
  it("is unavailable in a dry run, whatever the environment says", async () => {
    const model = fakeModel(`{"label":"x"}`);
    const r = router(model.impl, true);
    expect(r.available()).toBe(false);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toBeNull();
    expect(model.calls()).toBe(0);
  });

  it("is unavailable with no credentials, and does not call anything", async () => {
    delete process.env.LLM_API_KEY;
    resetEnv();
    const model = fakeModel(`{"label":"x"}`);
    const r = router(model.impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toBeNull();
    expect(model.calls()).toBe(0);
  });

  it("reads model names from the environment, never from the source", () => {
    const r = router(fakeModel().impl);
    expect(r.model("cheap")).toBe("test-cheap");
    expect(r.model("smart")).toBe("test-smart");
  });

  it("returns null when the tier has no model configured", async () => {
    delete process.env.LLM_MODEL_SMART;
    resetEnv();
    const model = fakeModel(`{"label":"x"}`);
    expect(
      await router(model.impl).ask({ tier: "smart", prompt: "hi", schema: Answer }),
    ).toBeNull();
    expect(model.calls()).toBe(0);
  });
});

describe("parsing and retries", () => {
  it("returns the parsed answer", async () => {
    const r = router(fakeModel(`{"label":"service"}`).impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toEqual({
      label: "service",
    });
  });

  it("unwraps a ```json fence, which models add even when told not to", async () => {
    const r = router(fakeModel("```json\n{\"label\":\"faq\"}\n```").impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toEqual({
      label: "faq",
    });
  });

  it("retries once with the parse error fed back, then succeeds", async () => {
    const model = fakeModel(`{"wrong":"shape"}`, `{"label":"ok"}`);
    const r = router(model.impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toEqual({
      label: "ok",
    });
    expect(model.calls()).toBe(2);
    expect(model.bodies[1]).toContain("label");  // the error was quoted back
  });

  it("gives up after the second failure rather than looping", async () => {
    const model = fakeModel(`{"wrong":1}`, `{"still":"wrong"}`, `{"label":"late"}`);
    const r = router(model.impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toBeNull();
    expect(model.calls()).toBe(2);
  });

  it("does not retry a transport failure — it would cost money for nothing", async () => {
    let calls = 0;
    const impl = (async () => {
      calls++;
      return new Response("upstream is down", { status: 502 });
    }) as unknown as typeof fetch;
    expect(
      await router(impl).ask({ tier: "cheap", prompt: "hi", schema: Answer }),
    ).toBeNull();
    expect(calls).toBe(1);
  });

  it("survives a reply that is not JSON at all", async () => {
    const r = router(fakeModel("ขอโทษครับ ผมไม่เข้าใจคำถาม").impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Answer })).toBeNull();
  });
});

describe("rule #1 — the model cannot produce a number", () => {
  /** Exactly the shape 06-keywords uses: terms and intent, no numeric field. */
  const Keywords = z.object({
    keywords: z.array(z.object({
      term: z.string(),
      intent: z.enum(["transactional", "informational", "navigational"]).optional(),
    })),
  });

  it("strips volume, difficulty and score even when the model insists", async () => {
    const meddling = JSON.stringify({
      keywords: [
        { term: "รับทำความสะอาดบ้าน ภูเก็ต", intent: "transactional", volume: 99999, difficulty: 12 },
      ],
      estimated_traffic: 45000,
      confidence: 0.98,
    });

    const answer = await router(fakeModel(meddling).impl).ask({
      tier: "cheap", prompt: "hi", schema: Keywords,
    });

    expect(answer).not.toBeNull();
    expect(answer!.keywords[0]).toEqual({
      term: "รับทำความสะอาดบ้าน ภูเก็ต",
      intent: "transactional",
    });
    // Nothing numeric survives, at any depth.
    expect(JSON.stringify(answer)).not.toMatch(/\d{3,}/);
    expect(Object.keys(answer!)).toEqual(["keywords"]);
  });

  it("rejects the whole answer when a required field is a number", async () => {
    const r = router(fakeModel(`{"keywords":[{"term":5400}]}`, `{"keywords":[]}`).impl);
    expect(await r.ask({ tier: "cheap", prompt: "hi", schema: Keywords })).toEqual({
      keywords: [],
    });
  });
});

describe("cost", () => {
  it("records tokens, model and a prompt hash — but not the prompt", async () => {
    const entries: Record<string, unknown>[] = [];
    const ledger = { record: async (e: Record<string, unknown>) => { entries.push(e); return 0; } };
    const http = new CachedFetch({
      cacheDir,
      fetchImpl: fakeModel(`{"label":"x"}`).impl,
      sleepImpl: async () => {},
      perDomainDelayMs: 0,
      ledger: ledger as never,
    });

    await new LlmRouter(http, log).ask({
      tier: "cheap", prompt: "ความลับของลูกค้า", schema: Answer,
    });

    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.model).toBe("test-cheap");
    expect(entry.tokensIn).toBe(100);
    expect(entry.tokensOut).toBe(50);
    expect(entry.promptHash).toMatch(/^[0-9a-f]{16}$/);
    expect(Number(entry.costThb)).toBeGreaterThan(0);
    expect(JSON.stringify(entry)).not.toContain("ความลับ");
  });

  it("charges nothing on a cache hit but still names the model", async () => {
    const entries: Record<string, unknown>[] = [];
    const ledger = { record: async (e: Record<string, unknown>) => { entries.push(e); return 0; } };
    const model = fakeModel(`{"label":"x"}`);
    const http = new CachedFetch({
      cacheDir, fetchImpl: model.impl, sleepImpl: async () => {},
      perDomainDelayMs: 0, ledger: ledger as never,
    });
    const r = new LlmRouter(http, log);

    await r.ask({ tier: "cheap", prompt: "same", schema: Answer });
    await r.ask({ tier: "cheap", prompt: "same", schema: Answer });

    expect(model.calls()).toBe(1);           // second one came from disk
    expect(entries).toHaveLength(2);
    expect(Number(entries[0]!.costThb)).toBeGreaterThan(0);
    expect(entries[1]!.costThb).toBe(0);
    expect(entries[1]!.cacheHit).toBe(true);
    expect(entries[1]!.model).toBe("test-cheap");
  });
});

describe("prompts", () => {
  it("loads a prompt file and fills its placeholders", async () => {
    const text = await loadPrompt("keywords", {
      domain: "example.com", businessType: "ทำความสะอาด", areas: "ภูเก็ต",
      services: "- ล้างแอร์", seeds: "- รับล้างแอร์", limit: "25",
    });
    expect(text).toContain("example.com");
    expect(text).toContain("ภูเก็ต");
    expect(text).not.toContain("{{domain}}");
    // Both prompts must carry the no-numbers instruction as well as the schema.
    expect(text).toContain("ห้ามใส่ตัวเลข");
  });

  it("leaves an unknown placeholder visible instead of writing undefined", async () => {
    const text = await loadPrompt("classify", { businessType: "ร้านอาหาร" });
    expect(text).toContain("ร้านอาหาร");
    expect(text).toContain("{{pages}}");
    expect(text).not.toContain("undefined");
  });
});

describe("stripFence", () => {
  it("leaves unfenced text alone", () => {
    expect(stripFence(`{"a":1}`)).toBe(`{"a":1}`);
  });
  it("takes the contents of a fence", () => {
    expect(stripFence("```json\n{\"a\":1}\n```")).toBe(`{"a":1}`);
  });
});
