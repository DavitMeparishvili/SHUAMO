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
    environment: "jsdom",
    setupFiles: ["src/test/unit/setup.tsx"],
  },
});
