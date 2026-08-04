import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const core = fileURLToPath(new URL("./packages/core/src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@core": core } },
  test: {
    // Rule: tests never touch the network. Everything runs against fixtures on
    // disk and PGlite in-process, so `pnpm test` costs nothing and works offline.
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
