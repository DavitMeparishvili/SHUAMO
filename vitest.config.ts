import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    exclude: [
      "**/*.integration.test.ts",
      // Deliberately broken sources fed to the boundary checker by
      // src/test/boundaries/verify-module-boundaries.test.ts.
      "src/test/boundaries/fixtures/**",
    ],
    environment: "node",
    setupFiles: ["src/test/unit/setup.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/modules/attribution/domain/**"],
      thresholds: {
        "src/modules/attribution/domain/**": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
