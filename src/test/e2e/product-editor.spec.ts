import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: "brand@aromashop.ge", password: "seeded-password-01" },
  });
  expect(response.ok()).toBe(true);
});

test("browser Back protects unsaved edits without the Navigation API", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "navigation", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/en/brand/products");
  await page.goto("/en/brand/products/new");
  await page.locator("#title").fill("Unsaved product");
  let dialogs = 0;
  page.once("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.evaluate(() => history.back());
  await expect.poll(() => dialogs).toBe(1);
  await expect(page.locator("#title")).toHaveValue("Unsaved product");
  await expect(page).toHaveURL(/products\/new$/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/en\/brand\/products$/);
});

for (const locale of ["en", "ka"]) {
  test(`${locale} editor has accessible fields, preview, and responsive layout`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/brand/products/new`);
    await page
      .locator("#title")
      .fill(locale === "en" ? "Test product" : "საცდელი პროდუქტი");
    await page.locator("#priceGel").fill("100");
    await page.locator("#commissionDisplay").fill("12.5");
    await expect(
      page.locator(".editor-offer-estimate [data-amount]"),
    ).toHaveAttribute("data-amount", "12.50");
    await page.locator(".editor-action-buttons button").first().click();
    await expect(page.locator(".editor-preview-dialog")).toBeVisible();
    await expect(
      page.locator(".editor-preview-dialog [data-amount='12.50']"),
    ).toBeVisible();
    await page.locator(".editor-preview-dialog > header button").click();
    await expect(page.locator("#title")).toHaveValue(
      locale === "en" ? "Test product" : "საცდელი პროდუქტი",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .include(".product-editor-page")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
}
