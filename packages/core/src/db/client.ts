/**
 * Database access.
 *
 * One interface, two implementations of the same SQL:
 *
 *   - **PGlite** (in-process Postgres, WASM) for tests and offline development.
 *     It runs `schema.sql` unmodified — uuid, jsonb, text[] and all — so tests
 *     exercise the real schema without Docker, without Supabase, and without a
 *     network. That is what makes `pnpm test` free and runnable anywhere.
 *   - **postgres.js** against a real `DATABASE_URL` for staging and production.
 *
 * Deliberately not an ORM. Queries are SQL strings with positional parameters,
 * which keeps `schema.sql` the single source of truth for the shape of the data.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type Row = Record<string, unknown>;

export interface Db {
  /** Parameterised query. `$1`-style placeholders, as Postgres wants. */
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  /** One row or null — the common case, spelled once. */
  one<T = Row>(sql: string, params?: unknown[]): Promise<T | null>;
  /** Multi-statement DDL. No parameters. */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  readonly driver: "pglite" | "postgres";
}

const SCHEMA_PATH = fileURLToPath(new URL("./schema.sql", import.meta.url));

export async function readSchema(): Promise<string> {
  return readFile(SCHEMA_PATH, "utf8");
}

/** Apply schema.sql. Safe to run repeatedly — every statement is IF NOT EXISTS. */
export async function applySchema(db: Db): Promise<void> {
  await db.exec(await readSchema());
}

// ---------------------------------------------------------------------------
// PGlite
// ---------------------------------------------------------------------------
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();

  const db: Db = {
    driver: "pglite",
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await pg.query(sql, params as never[]);
      return res.rows as T[];
    },
    async one<T>(sql: string, params: unknown[] = []) {
      const rows = await db.query<T>(sql, params);
      return rows[0] ?? null;
    },
    async exec(sql: string) {
      await pg.exec(sql);
    },
    async close() {
      await pg.close();
    },
  };
  return db;
}

// ---------------------------------------------------------------------------
// postgres.js
// ---------------------------------------------------------------------------
export async function createPostgresDb(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // Supabase's pooler does not support prepared statements; disabling them
  // costs nothing at this volume and avoids a failure that only appears in
  // production.
  const sql = postgres(url, { prepare: false, onnotice: () => {} });

  const db: Db = {
    driver: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    async one<T>(text: string, params: unknown[] = []) {
      const rows = await db.query<T>(text, params);
      return rows[0] ?? null;
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
  return db;
}

/**
 * Pick a driver from the environment.
 *
 * `DATABASE_URL` set  -> real Postgres (Supabase).
 * unset               -> PGlite at `.data/dev` so a clone works with no setup.
 */
export async function createDb(opts: { url?: string; dataDir?: string } = {}): Promise<Db> {
  const url = opts.url ?? process.env.DATABASE_URL;
  if (url && url.trim()) return createPostgresDb(url.trim());
  return createPgliteDb(opts.dataDir ?? process.env.PGLITE_DIR ?? ".data/dev");
}

/** A throwaway in-memory database with the schema already applied. For tests. */
export async function createTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  await applySchema(db);
  return db;
}
