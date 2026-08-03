/**
 * The only way this codebase talks to a language model.
 *
 * Two tiers, named in the environment and never in the source: `cheap` runs
 * many times per audit (classifying pages, proposing keywords), `smart` runs
 * once (the narrative, M5). Prices and model generations change every few
 * months; a model name compiled into a file is a name nobody updates.
 *
 * ## What this deliberately refuses to do
 *
 * The model is never asked for a number that ends up in a report. Project rule
 * #1 is that every score, count and rank comes from code that can be re-run to
 * the same answer, and the enforcement is here rather than in a prompt: callers
 * pass a zod schema, `ask()` returns only what that schema admits, and the
 * schemas used for keyword and classification work have no numeric fields at
 * all. A model that helpfully volunteers `"volume": 5400` has it stripped
 * before any caller sees it — no prompt wording required, and no way to forget.
 *
 * ## Failure is normal and must not fail the audit
 *
 * Bad JSON gets exactly one retry, with the parse error fed back. After that
 * `ask()` returns null and the caller falls back to what it computed itself.
 * An audit that dies because a model returned a stray comma would be a worse
 * product than one with slightly fewer keyword suggestions.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import type { CachedFetch } from "../http/cached-fetch.ts";
import type { Logger } from "../log/logger.ts";
import { llmThb } from "../cost/pricing.ts";
import { env, hasLlm } from "../env.ts";

export type Tier = "cheap" | "smart";

/** The slice of an OpenAI-compatible response we rely on. */
const ChatResponse = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .optional(),
});

export interface AskOptions<T> {
  tier: Tier;
  /** The user message. Render it from a prompt file with `loadPrompt`. */
  prompt: string;
  system?: string;
  /** The contract. Anything outside it never reaches the caller. */
  schema: z.ZodType<T>;
  maxTokens?: number;
  /** 0 by default: the same site should produce the same answer. */
  temperature?: number;
}

export class LlmRouter {
  constructor(
    private readonly http: CachedFetch,
    private readonly log: Logger,
    /** No external calls at all. `ask` returns null immediately. */
    private readonly dryRun = false,
  ) {}

  /** Configured and permitted to run. Callers branch on this to plan work. */
  available(): boolean {
    return !this.dryRun && hasLlm();
  }

  model(tier: Tier): string | null {
    const e = env();
    return (tier === "cheap" ? e.LLM_MODEL_CHEAP : e.LLM_MODEL_SMART) ?? null;
  }

  /**
   * Ask once, validate, retry once on a schema failure, then give up.
   * Returns null whenever the caller should use its own fallback.
   */
  async ask<T>(opts: AskOptions<T>): Promise<T | null> {
    if (!this.available()) return null;
    const model = this.model(opts.tier);
    if (!model) {
      this.log.warn("no model configured for tier", { tier: opts.tier });
      return null;
    }

    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt =
        attempt === 0
          ? opts.prompt
          : `${opts.prompt}\n\n---\nคำตอบก่อนหน้าใช้ไม่ได้: ${lastError}\nตอบใหม่เป็น JSON ที่ถูกต้องเท่านั้น ห้ามมีข้อความอื่นนอก JSON`;

      const raw = await this.call(model, opts, prompt);
      if (raw === null) return null; // transport failure: retrying costs money for nothing

      const parsed = opts.schema.safeParse(raw);
      if (parsed.success) return parsed.data;

      lastError = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      this.log.warn("llm response did not match the schema", {
        tier: opts.tier, attempt: attempt + 1, error: lastError,
      });
    }
    return null;
  }

  /** One HTTP round trip. Returns parsed JSON, or null if anything went wrong. */
  private async call<T>(
    model: string, opts: AskOptions<T>, prompt: string,
  ): Promise<unknown | null> {
    const e = env();
    const body = JSON.stringify({
      model,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0,
      max_tokens: opts.maxTokens ?? 2000,
      response_format: { type: "json_object" },
    });
    const promptHash = createHash("sha256").update(prompt).digest("hex").slice(0, 16);

    const res = await this.http.get(joinUrl(e.LLM_BASE_URL!, "/chat/completions"), {
      kind: "llm",
      method: "POST",
      respectRobots: false,
      provider: "llm",
      timeoutMs: 90_000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${e.LLM_API_KEY}`,
      },
      body,
      onCost: (r) => {
        const usage = readUsage(r.body);
        return {
          model,
          promptHash,
          tokensIn: usage.in,
          tokensOut: usage.out,
          costThb: llmThb(opts.tier, usage.in + usage.out),
        };
      },
    });

    if (!res.ok) {
      this.log.warn("llm call failed", { status: res.status, error: res.error });
      return null;
    }

    const content = contentOf(res.body);
    if (content === null) {
      this.log.warn("llm returned an unexpected envelope");
      return null;
    }
    try {
      return JSON.parse(stripFence(content));
    } catch {
      this.log.warn("llm returned content that is not JSON");
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Prompts live in .md files so wording can be edited without touching code.
// ---------------------------------------------------------------------------
const PROMPT_DIR = fileURLToPath(new URL("./prompts/", import.meta.url));
const cache = new Map<string, string>();

/**
 * Load `prompts/<name>.md` and substitute `{{key}}` placeholders.
 *
 * Values are inserted verbatim: the model sees the client's own page titles,
 * which is the point. An unknown placeholder is left alone rather than
 * replaced with "undefined", so a typo is visible in the prompt instead of
 * quietly becoming a word the model reads as an instruction.
 */
export async function loadPrompt(
  name: string, vars: Record<string, string> = {},
): Promise<string> {
  let template = cache.get(name);
  if (template === undefined) {
    template = await readFile(PROMPT_DIR + name + ".md", "utf8");
    cache.set(name, template);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    Object.hasOwn(vars, key) ? (vars[key] ?? "") : whole,
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function contentOf(body: string): string | null {
  try {
    const parsed = ChatResponse.parse(JSON.parse(body));
    return parsed.choices[0]?.message.content ?? null;
  } catch {
    return null;
  }
}

function readUsage(body: string): { in: number; out: number } {
  try {
    const parsed = ChatResponse.parse(JSON.parse(body));
    return {
      in: parsed.usage?.prompt_tokens ?? 0,
      out: parsed.usage?.completion_tokens ?? 0,
    };
  } catch {
    return { in: 0, out: 0 };
  }
}

/** Some models wrap JSON in a ```json fence even when asked not to. */
export function stripFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced?.[1] ?? text).trim();
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}
