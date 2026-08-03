/**
 * Writes the last test result to `.ctx-tests` so `pnpm ctx` can report it
 * without re-running the suite. Invoked by the `test` script.
 */
import { writeFileSync } from "node:fs";
const [passed, total] = process.argv.slice(2);
writeFileSync(
  new URL("../.ctx-tests", import.meta.url),
  `${passed}/${total} passed · ${new Date().toISOString().slice(0, 16).replace("T", " ")}\n`,
);
