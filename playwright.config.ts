import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const baseURL = process.env.APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./src/test/e2e",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}",
  forbidOnly: isCi,
  workers: 1,
  reporter: isCi ? [["dot"], ["html", { open: "never" }]] : "line",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Always the built artifact, never the dev server. `verify:phase-0` builds
    // immediately before this runs, and testing the thing that was just built
    // is the only version of this that proves anything about a deployment.
    // `pnpm test:e2e` on its own therefore needs a `pnpm build` first.
    command: "pnpm start",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: !isCi,
  },
});
