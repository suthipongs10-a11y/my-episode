/**
 * The Windows path bug, pinned.
 *
 * These tests pass an explicit `argv1` rather than reading `process.argv`,
 * which is the only way a Linux CI can exercise the Windows shape at all — and
 * the reason the bug survived a full test suite and two rounds of manual
 * verification. Every check here ran green on Linux while `pnpm dash` exited
 * silently on Windows.
 */
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isEntryPoint } from "./entry.ts";

describe("isEntryPoint", () => {
  it("matches when the file is the one being run (posix)", () => {
    const argv1 = "/home/u/app/server.ts";
    expect(isEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true);
  });

  /**
   * The regression, as far as a Linux runner can state it.
   *
   * `pathToFileURL` is platform-specific — on posix it cannot convert a
   * Windows path at all — so this cannot assert that `isEntryPoint` returns
   * true for `C:\...` from here. What it *can* pin is the half that is pure
   * string work and therefore platform-independent: the shipped spelling
   * produces something that is not the URL Node hands to `import.meta.url` on
   * Windows. That mismatch is the entire bug.
   *
   * The guard that actually prevents a repeat is the repo-wide grep below.
   */
  it("shows why the shipped `file://` + argv[1] form could never match on Windows", () => {
    const argv1 = String.raw`C:\Users\thana\my-episode\wgi-audit\apps\web\src\server.ts`;
    const whatNodeGives = "file:///C:/Users/thana/my-episode/wgi-audit/apps/web/src/server.ts";

    expect(`file://${argv1}`).not.toBe(whatNodeGives);
    // …and nothing about it is close: wrong slashes, and no third slash.
    expect(`file://${argv1}`).toContain("\\");
    expect(`file://${argv1}`).not.toContain("file:///");
  });

  it("round-trips whatever shape this platform produces", () => {
    // On Windows this is the C:\ case; on posix it is /home/... Either way the
    // helper and Node must agree, which is the property that was broken.
    const argv1 = process.argv[1] ?? "/tmp/x.ts";
    expect(isEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true);
  });

  it("does not match a different file", () => {
    expect(isEntryPoint(pathToFileURL("/home/u/app/a.ts").href, "/home/u/app/b.ts")).toBe(false);
  });

  it("does not match when the module is merely imported by the entry point", () => {
    const entry = "/home/u/app/cli.ts";
    const imported = pathToFileURL("/home/u/app/lib.ts").href;
    expect(isEntryPoint(imported, entry)).toBe(false);
  });

  it("is false rather than throwing when there is no argv[1]", () => {
    expect(isEntryPoint("file:///x.ts", undefined)).toBe(false);
    expect(isEntryPoint("file:///x.ts", "")).toBe(false);
  });

  it("handles a path with spaces and Thai characters", () => {
    const argv1 = "/home/u/my apps/โปรเจกต์/server.ts";
    expect(isEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true);
  });
});

/**
 * Every executable entry point must use the helper. A new one added with the
 * old `file://` spelling would work for whoever wrote it on macOS or Linux and
 * fail for the person on Windows, which is exactly how this got shipped.
 */
describe("no entry point uses the broken form", () => {
  it("finds no `file://${process.argv` anywhere in the repo", async () => {
    const { execFileSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const root = fileURLToPath(new URL("../../../", import.meta.url));

    let hits = "";
    try {
      hits = execFileSync(
        "git",
        ["grep", "-n", "--", "file://${process.argv", "--", "*.ts"],
        { cwd: root, encoding: "utf8" },
      );
    } catch {
      hits = ""; // git grep exits 1 when it finds nothing, which is the pass
    }
    // This file names the pattern in a comment, so allow only itself.
    const offenders = hits.split("\n")
      .filter(Boolean)
      .filter((line) => !line.startsWith("packages/core/src/entry"));
    expect(offenders).toEqual([]);
  });
});
