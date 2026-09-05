import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ka"] as const) {
  test(`Xurjin ${locale} landing and navigation`, async ({ page }, info) => {
    await page.goto(`/${locale}`);
    await expect(page.locator(".xurjin-logo").first()).toContainText("Xurjin");
    await expect(page.locator(".audience-card")).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (info.project.name.includes("mobile")) {
      await page.locator(".mobile-menu").click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    }
    await page.locator(".video-link").click();
    await expect(page.locator(".soon-label")).toHaveText(
      locale === "en" ? "Coming soon" : "მალე",
    );
  });

  for (const role of ["creator", "brand"] as const) {
    test(`Xurjin ${locale} ${role} registration stages and pending access`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/sign-up?role=${role}`);
      await page.locator("#reg-name").fill("Xurjin browser review");
      if (role === "brand")
        await page.locator("#reg-contactName").fill("Contact Person");
      else await page.locator("#reg-alias").fill("Public Creator");
      await page
        .locator("#reg-email")
        .fill(`xurjin-${crypto.randomUUID()}@example.test`);
      await page.locator("#reg-password").fill("Browser-test-password-2026");
      const next = () =>
        page
          .getByRole("button", {
            name: locale === "en" ? "Continue" : "გაგრძელება",
            exact: true,
          })
          .click();
      await next();
      await page
        .locator("#reg-instagram")
        .fill("https://instagram.com/xurjin_example");
      await next();
      await page.locator("#reg-city").fill("Tbilisi");
      await page.locator("#reg-category").selectOption("beauty");
      await next();
      await page
        .getByRole("button", {
          name: locale === "en" ? "Back" : "უკან",
          exact: true,
        })
        .click();
      await expect(page.locator("#reg-city")).toHaveValue("Tbilisi");
      await next();
      await page
        .getByRole("button", {
          name: locale === "en" ? "Submit application" : "განაცხადის გაგზავნა",
          exact: true,
        })
        .click();
      await expect(page.locator(".registration-status")).toBeVisible();
      await page.goto(`/${locale}/workspace`);
      await expect(page).toHaveURL(/sign-up\?status=pending/);
      await expect(page.locator(".registration-status")).toBeVisible();
    });
  }

  test(`Xurjin ${locale} key public surfaces are accessible`, async ({
    page,
  }) => {
    for (const route of ["", "/sign-in", "/sign-up?role=creator"]) {
      await page.goto(`/${locale}${route}`);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  });
}
