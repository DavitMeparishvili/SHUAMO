import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ka"] as const) {
  test(`Xurjin ${locale} landing and navigation`, async ({ page }, info) => {
    const expectAtSection = async (id: string) => {
      await expect
        .poll(() =>
          page
            .locator(`#${id}`)
            .evaluate((section) =>
              Math.abs(
                section.getBoundingClientRect().top -
                  parseFloat(getComputedStyle(section).scrollMarginTop),
              ),
            ),
        )
        .toBeLessThan(2);
    };
    await page.goto(`/${locale}`);
    await expect(page.locator(".xurjin-logo").first()).toHaveAccessibleName(
      "Xurjin",
    );
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
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.locator("#how-it-works")).toBeInViewport();
    // A repeated click must scroll again even when the URL already has this hash.
    // Visibility alone misses the bug on desktop, where the section peeks above the fold.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.locator(".video-link").click();
    await expectAtSection("how-it-works");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    if (info.project.name.includes("mobile")) {
      await page.locator(".mobile-menu").click();
      await page.locator('dialog a[href$="#how-it-works"]').click();
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    } else {
      await page.locator('.marketing-nav a[href$="#how-it-works"]').click();
    }
    await expectAtSection("how-it-works");
    await page.locator('footer a[href$="#how-it-works"]').first().click();
    await expectAtSection("how-it-works");
    await expect(page.locator('a[href*="coming-soon"]')).toHaveCount(0);
    const missingTargets = await page
      .locator('a[href*="#"]')
      .evaluateAll((links) =>
        links
          .map((link) => new URL((link as HTMLAnchorElement).href).hash)
          .filter(
            (hash) =>
              hash &&
              !document.getElementById(decodeURIComponent(hash.slice(1))),
          ),
      );
    expect(missingTargets).toEqual([]);
    for (const [index, section, role] of [
      [0, "for-brands", "brand"],
      [1, "for-creators", "creator"],
    ] as const) {
      await page.locator(".audience-card").nth(index).click();
      await expect(page).toHaveURL(new RegExp(`#${section}$`));
      await expect(page.locator(`#${section}`)).toBeInViewport();
      await expectAtSection(section);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.locator(".audience-card").nth(index).click();
      await expectAtSection(section);
      await page.locator(`#${section} .x-button`).click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/sign-up\\?role=${role}$`),
      );
      await expect(page.locator("#reg-name")).toBeVisible();
      await page.goto(`/${locale}`);
    }
    const firstQuestion = page.locator("#faq summary").first();
    await firstQuestion.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#faq details").first()).toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#faq details p").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#faq details").first()).not.toHaveAttribute(
      "open",
      "",
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
