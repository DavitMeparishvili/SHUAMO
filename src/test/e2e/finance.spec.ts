import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
const brandId = "93000000-0000-4000-8000-000000000202",
  creatorId = "93000000-0000-4000-8000-000000000203",
  password = "Finance-demo-only-2026!";
for (const locale of ["en", "ka"] as const)
  test(`@finance ${locale} invoices, external payments, reversals and owner access`, async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(150000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/seed-finance.ts", "--reset"],
      { cwd: process.cwd(), env: process.env, stdio: "pipe" },
    );
    const t = (en: string, ka: string) => (locale === "ka" ? ka : en);
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#email").fill("finance-admin@example.test");
    await page.locator("#password").fill(password);
    await page
      .getByRole("button", { name: t("Sign in", "შესვლა"), exact: true })
      .click();
    await page.waitForURL(`**/${locale}/admin/finance`);
    const context = await browser.newContext({ baseURL: baseURL! });
    expect(
      (
        await context.request.post("/api/auth/sign-in/email", {
          data: { email: "finance-brand@example.test", password },
        })
      ).status(),
    ).toBe(200);
    const owner = await context.newPage();
    owner.on("pageerror", (error) => pageErrors.push(error.message));
    const contextC = await browser.newContext({ baseURL: baseURL! });
    expect(
      (
        await contextC.request.post("/api/auth/sign-in/email", {
          data: { email: "finance-creator@example.test", password },
        })
      ).status(),
    ).toBe(200);
    const creator = await contextC.newPage();
    creator.on("pageerror", (error) => pageErrors.push(error.message));
    async function account(kind: string, id: string) {
      await page.goto(`/${locale}/admin/finance/${kind}/${id}`);
    }
    async function balance(p: Page, value: string) {
      await expect(
        p.locator('[data-testid="finance-balance"] [data-amount]').first(),
      ).toHaveAttribute("data-amount", value);
    }
    async function ownerBalances(b: string, c: string) {
      await owner.goto(`/${locale}/brand/finance`);
      await creator.goto(`/${locale}/creator/finance`);
      await balance(owner, b);
      await balance(creator, c);
    }
    async function record(kind: string, id: string, amount: string) {
      await account(kind, id);
      await page
        .getByRole("button", {
          name:
            kind === "brand"
              ? t("Record payment received", "მიღებული გადახდის აღრიცხვა")
              : t("Record payout made", "გაცემული გადახდის აღრიცხვა"),
          exact: true,
        })
        .click();
      await page.locator("#payment-amount").fill(amount);
      await page.locator("#payment-reference").fill("BROWSER-DEMO");
      await page.locator("#payment-note").fill("Owner-visible browser test");
      await page.locator('dialog[open] button[type="submit"]').click();
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    }
    await ownerBalances("300.00", "300.00");
    let brandInvoice = "";
    for (const [kind, id] of [
      ["brand", brandId],
      ["creator", creatorId],
    ]) {
      await account(kind!, id!);
      await page
        .getByRole("button", {
          name: t("Generate invoice", "ინვოისის შექმნა"),
          exact: true,
        })
        .click();
      await expect(page.locator("#invoice-document")).toBeVisible();
      if (kind === "creator")
        await expect(
          page.locator(".finance-document-parties section").first(),
        ).toContainText("Xurjin");
      await page
        .locator('.finance-preview-aside button[type="submit"]')
        .click();
      await page.waitForURL("**/finance/invoices/*");
      if (kind === "brand") brandInvoice = page.url().split("/").at(-1)!;
      const downloadEvent = page.waitForEvent("download");
      await page
        .getByRole("link", {
          name: t("Download HTML", "HTML-ის ჩამოტვირთვა"),
          exact: true,
        })
        .click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toMatch(
        /^XU-[BC]-\d{4}-\d{6}\.html$/,
      );
      const html = await readFile((await download.path())!, "utf8");
      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain(locale === "ka" ? "300,00" : "300.00");
      await page.emulateMedia({ media: "print" });
      await expect(page.locator("#invoice-document")).toBeVisible();
      await expect(page.locator(".finance-no-print:visible")).toHaveCount(0);
      await page.emulateMedia({ media: "screen" });
    }
    await ownerBalances("300.00", "300.00");
    await record("creator", creatorId, "200.00");
    await ownerBalances("300.00", "100.00");
    await record("brand", brandId, "100.00");
    await ownerBalances("200.00", "100.00");
    await account("brand", brandId);
    await page.locator(".finance-record summary").first().click();
    await page
      .getByRole("button", {
        name: t("Reverse payment record", "გადახდის ჩანაწერის გაუქმება"),
        exact: true,
      })
      .click();
    await page.locator("#reverse-reason").fill("Wrong amount");
    await page
      .locator(".finance-reversal-dialog button.finance-primary")
      .click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await ownerBalances("300.00", "100.00");
    await record("brand", brandId, "350.00");
    await record("creator", creatorId, "150.00");
    await ownerBalances("-50.00", "-50.00");
    await expect(
      owner.getByRole("button", {
        name: t("Generate invoice", "ინვოისის შექმნა"),
      }),
    ).toHaveCount(0);
    expect(
      (
        await contextC.request.get(
          `/api/finance/invoices/${brandInvoice}/download?locale=${locale}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.get(
          "/api/admin/performance/export?scope=products",
        )
      ).status(),
    ).toBe(403);
    await account("creator", creatorId);
    await page
      .getByRole("button", {
        name: t("Record payout made", "გაცემული გადახდის აღრიცხვა"),
        exact: true,
      })
      .click();
    await expect(page.locator("#payment-amount")).toHaveValue("");
    const axe = await new AxeBuilder({ page })
      .include(".finance-surface")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await owner.goto(`/${locale}/brand`);
    await balance(owner, "-50.00");
    await owner.goto(`/${locale}/brand?period=7d`);
    await balance(owner, "-50.00");
    expect(pageErrors).toEqual([]);
    await context.close();
    await contextC.close();
  });
