import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const productId = "32000000-0000-4000-8000-000000000001";

for (const locale of ["en", "ka"]) {
  test(`${locale} brand catalogue opens shared details and owner editing`, async ({
    page,
  }) => {
    const response = await page.request.post("/api/auth/sign-in/email", {
      data: { email: "brand@aromashop.ge", password: "seeded-password-01" },
    });
    expect(response.ok()).toBe(true);
    await page.goto(`/${locale}/brand/products`);
    await page.getByRole("searchbox").fill("AROMA-100");
    await page
      .locator(
        `.pl-product-details-link[href='/${locale}/products/${productId}']:visible`,
      )
      .click();
    await expect(page).toHaveURL(`/${locale}/products/${productId}`);
    await expect(page.locator(".product-detail-mobile-back")).toHaveAttribute(
      "href",
      `/${locale}/brand/products`,
    );
    const edit = page.locator(".product-detail-edit");
    await expect(edit).toHaveAttribute(
      "href",
      `/${locale}/brand/products/${productId}`,
    );
    await expect(edit).toHaveText(
      locale === "en" ? "Edit product" : "პროდუქტის რედაქტირება",
    );
    await expect(
      page.locator(".product-gallery-stage .product-gallery-arrow"),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .include(".product-detail")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await edit.click();
    await expect(page.locator(".product-editor-page")).toBeVisible();
    const view = page.locator(".editor-view-product");
    await expect(view).toHaveAttribute(
      "href",
      `/${locale}/products/${productId}`,
    );
    const title = await page.locator("#title").inputValue();
    await page.locator("#title").fill(`${title} unsaved`);
    page.once("dialog", (dialog) => dialog.dismiss());
    await view.click();
    await expect(page.locator("#title")).toHaveValue(`${title} unsaved`);
    page.once("dialog", (dialog) => dialog.accept());
    await view.click();
    await expect(page).toHaveURL(`/${locale}/products/${productId}`);
    await page.context().clearCookies();
    await page.reload();
    await expect(page.locator(".product-detail")).toBeVisible();
    await expect(edit).toHaveCount(0);
    await page.request.post("/api/auth/sign-in/email", {
      data: { email: "nino@creators.ge", password: "seeded-password-01" },
    });
    await page.reload();
    await expect(page.locator(".product-detail")).toBeVisible();
    await expect(edit).toHaveCount(0);
  });
}
