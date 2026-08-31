import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["src/test/integration/setup.ts"],
    // These tests share one database. Running files in parallel would let one
    // file's truncation delete another file's fixture mid-assertion.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
