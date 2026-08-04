/** `pnpm db:push` — apply schema.sql to whatever DATABASE_URL points at. */
import { applySchema, createDb } from "@core/db/client.ts";
import { createLogger } from "@core/log/logger.ts";

const log = createLogger();
const db = await createDb();
try {
  await applySchema(db);
  log.info("schema applied", { driver: db.driver });
} finally {
  await db.close();
}
