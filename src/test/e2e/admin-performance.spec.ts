import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
const brand = "93000000-0000-4000-8000-000000000204";
for (const locale of ["en", "ka"] as const)
  test(`@admin-performance ${locale} all products, scope, filters and CSV`, async ({
    page,
    request,
    isMobile,
  }) => {
    test.setTimeout(90000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const t = (en: string, ka: string) => (locale === "ka" ? ka : en);
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#email").fill("finance-admin@example.test");
    await page.locator("#password").fill("Finance-demo-only-2026!");
    await page
      .getByRole("button", { name: t("Sign in", "შესვლა"), exact: true })
      .click();
    await page.waitForURL("**/admin/finance");
    await page.goto(`/${locale}/admin/performance?brandId=${brand}`);
    await expect(
      page.getByRole("heading", {
        name: t("Platform payments", "პლატფორმის გადახდები"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".finance-chart")).toHaveCount(2);
    async function csv() {
      const event = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name: t("Download CSV", "CSV-ის ჩამოტვირთვა"),
          exact: true,
        })
        .click();
      const download = await event;
      return readFile((await download.path())!, "utf8");
    }
    expect(await csv()).toContain('"Current platform brand credits (GEL)"');
    await page.goto(`/${locale}/admin/products?brandId=${brand}&page=2`);
    await expect(page.locator(".finance-pagination")).toContainText("2 / 2");
    const all = await csv();
    expect(all.trim().split("\r\n")).toHaveLength(27);
    expect(all).toContain('"ARCHIVED"');
    await page.goto(
      `/${locale}/admin/products?brandId=${brand}&q=Report%20product%2024`,
    );
    await expect(
      page.locator(
        isMobile ? ".finance-mobile-cards" : ".finance-desktop-table",
      ),
    ).toContainText(t("Archived", "დაარქივებული"));
    await page
      .locator(
        isMobile
          ? ".finance-mobile-cards h3 a"
          : ".finance-report-table tbody tr td:first-child a",
      )
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Report product 24", exact: true }),
    ).toBeVisible();
    expect(await csv()).toContain('"Creator ID"');
    await page.locator("[data-product-back]").click();
    await expect(page).toHaveURL(/q=Report\+product\+24/);
    for (const tab of ["brands", "creators"]) {
      await page.goto(
        `/${locale}/admin/performance?tab=${tab}&brandId=${brand}`,
      );
      await expect(
        page.locator(
          isMobile ? ".finance-mobile-cards" : ".finance-desktop-table",
        ),
      ).toContainText(
        t("Account payments (period)", "ანგარიშის გადახდები (პერიოდი)"),
      );
      expect(await csv()).toContain(
        tab === "brands"
          ? '"Account outstanding all time (GEL)"'
          : '"Account unpaid all time (GEL)"',
      );
    }
    await page.goto(`/${locale}/admin/products?brandId=${brand}`);
    if (isMobile)
      await page
        .getByRole("button", { name: t("Filters", "ფილტრები"), exact: true })
        .click();
    const prefix = isMobile ? "mobile" : "desktop";
    await page.locator(`#${prefix}-status`).selectOption("ARCHIVED");
    await page
      .locator(isMobile ? "dialog[open]" : "form.finance-report-filters")
      .getByRole("button", {
        name: t("Apply filters", "ფილტრების გამოყენება"),
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/productStatus=ARCHIVED/);
    await expect(page.locator(".finance-pagination")).toContainText("1 / 1");
    const axe = await new AxeBuilder({ page })
      .include(".finance-surface")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await request.get("/api/admin/performance/export?scope=products")
      ).status(),
    ).toBe(401);
    expect(pageErrors).toEqual([]);
  });
