import { expect, test } from "@playwright/test";

for (const locale of ["ka", "en"] as const) {
  test(`${locale} landing renders with reachable main content`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);

    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("main")).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });
}

test("liveness does not depend on PostgreSQL", async ({ request }) => {
  const response = await request.get("/api/health/live");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("readiness reports the database", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
});

test("an unknown locale is a 404, not a crash", async ({ page }) => {
  const response = await page.goto("/de");
  expect(response?.status()).toBe(404);
});
