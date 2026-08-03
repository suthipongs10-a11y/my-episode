/**
 * Environment. Every secret and every model name lives here and nowhere else.
 *
 * Model names in particular are read from the environment on purpose: prices
 * and model generations change every few months, and a name compiled into the
 * source is a name nobody remembers to update.
 */
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().optional(),

  // External APIs — all optional so the repo runs with none of them.
  PSI_API_KEY: z.string().optional(),
  DFS_LOGIN: z.string().optional(),
  DFS_PASSWORD: z.string().optional(),
  GOOGLE_PLACES_KEY: z.string().optional(),

  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL_CHEAP: z.string().optional(),
  LLM_MODEL_SMART: z.string().optional(),

  // Caching and cost control
  CACHE_DIR: z.string().default(".cache"),
  HTTP_USER_AGENT: z
    .string()
    .default("WGIAuditBot/0.1 (+https://example.com/bot; audit requested by site owner)"),
  /** Milliseconds between requests to one domain. One second is the polite
   *  default; tests and local fixture servers set it to 0. */
  HTTP_DELAY_MS: z.coerce.number().default(1000),
  COST_BUDGET_THB: z.coerce.number().default(40),
  COST_HARD_STOP_THB: z.coerce.number().default(60),
});

export type Env = z.infer<typeof Env>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) cached = Env.parse(process.env);
  return cached;
}

/** Test helper: forget the parsed environment so a changed process.env is read. */
export function resetEnv(): void {
  cached = null;
}

export function hasLlm(e: Env = env()): boolean {
  return Boolean(e.LLM_BASE_URL && e.LLM_API_KEY);
}
