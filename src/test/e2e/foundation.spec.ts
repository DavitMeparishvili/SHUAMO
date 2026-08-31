import { expect, test } from "@playwright/test";

// Restated here on purpose: an acceptance test that imports the catalogue can
// only prove the page agrees with itself.
const EXPECTED = {
  ka: {
    title: "SHUAMO — კრეატორების შედეგი, გაზომილი.",
  },
  en: {
    title: "SHUAMO — Creator performance, measured.",
  },
} as const;

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

  // WCAG 2.2 §2.4.2. Every later page inherits whatever this establishes.
  test(`${locale} landing carries a localised title`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page).toHaveTitle(EXPECTED[locale].title);
  });

  test(`an unknown path under /${locale} is a 404 with a real document`, async ({
    page,
  }) => {
    const response = await page.goto(`/${locale}/no-such-page`);

    expect(response?.status()).toBe(404);

    // Not Next's bare <html id="__next_error__"> shell. A notFound() thrown
    // below app/[locale]/layout.tsx composes the root not-found *inside* that
    // layout's <html>, which nests two documents and collapses to the error
    // shell — see docs/development.md, "Locale-scoped 404s".
    await expect(page.locator("html")).not.toHaveAttribute(
      "id",
      "__next_error__",
    );
    await expect(page.getByRole("heading").first()).toBeVisible();
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
