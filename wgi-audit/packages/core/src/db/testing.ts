/**
 * Test database helpers.
 *
 * Standing up a PGlite instance costs a second or two. Doing it per test made
 * the suite take half a minute at twelve tests, which is the kind of thing that
 * quietly stops people running tests at all. One instance per test file, wiped
 * between tests, keeps isolation and gives the time back.
 */
import { applySchema, createPgliteDb, type Db } from "./client.ts";

/** Every table, children first, so TRUNCATE order never fights a foreign key. */
const TABLES = [
  "api_calls", "jobs", "narratives", "findings", "rankings", "keywords",
  "pages", "snapshots", "audit_runs", "competitors", "clients",
] as const;

let shared: Promise<Db> | null = null;

/** The file-scoped database, created on first use with the schema applied. */
export function sharedTestDb(): Promise<Db> {
  shared ??= (async () => {
    const db = await createPgliteDb();
    await applySchema(db);
    return db;
  })();
  return shared;
}

/** Empty every table. Call in `beforeEach`. */
export async function truncateAll(db: Db): Promise<void> {
  await db.exec(`truncate ${TABLES.join(", ")} restart identity cascade`);
}

/** Fresh database for the rare test that needs its own instance. */
export async function isolatedTestDb(): Promise<Db> {
  const db = await createPgliteDb();
  await applySchema(db);
  return db;
}

/** Release the shared instance. Call in `afterAll`. */
export async function closeSharedTestDb(): Promise<void> {
  if (!shared) return;
  const db = await shared;
  shared = null;
  await db.close();
}
