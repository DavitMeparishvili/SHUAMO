import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const baseURL = process.env.APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./src/test/e2e",
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
    command: isCi ? "pnpm start" : "pnpm dev",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: !isCi,
  },
});
