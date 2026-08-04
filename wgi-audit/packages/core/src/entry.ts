/**
 * "Was this file run directly, or imported?"
 *
 * The obvious spelling is wrong on Windows and silently so:
 *
 *     import.meta.url === `file://${process.argv[1]}`     // ✗
 *
 * On Linux `process.argv[1]` is `/home/u/app/server.ts` and gluing `file://`
 * in front happens to produce exactly what `import.meta.url` holds. On Windows
 * argv[1] is `C:\Users\...\server.ts` — backslashes, a drive letter, no leading
 * slash — while `import.meta.url` is `file:///C:/Users/.../server.ts`. The two
 * never match, the guard never fires, and the program exits **0 with no output
 * at all**: no error, no stack, nothing to search for.
 *
 * That shipped, and it took a user on Windows running `pnpm dash` and getting
 * their prompt back to find it. Everything here had been verified on Linux,
 * where the bug cannot occur.
 *
 * `pathToFileURL` is the conversion Node provides for exactly this, and it
 * handles the drive letter, the separators and percent-encoding.
 */
import { pathToFileURL } from "node:url";

/**
 * True when `moduleUrl` is the module Node was told to run.
 *
 * Call it as `isEntryPoint(import.meta.url)`.
 */
export function isEntryPoint(moduleUrl: string, argv1 = process.argv[1]): boolean {
  if (!argv1) return false;
  try {
    return moduleUrl === pathToFileURL(argv1).href;
  } catch {
    return false;
  }
}
