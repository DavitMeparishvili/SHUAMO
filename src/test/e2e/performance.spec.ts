import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BRAND = { email: "brand@aromashop.ge", password: "seeded-password-01" };
const CREATOR = { email: "nino@creators.ge", password: "seeded-password-01" };

async function signIn(page: Page, user: typeof BRAND) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/(brand|creator)$/);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("@phase-6 creator performance connects link activity to its earnings trail", async ({
  page,
}) => {
  await signIn(page, CREATOR);
  await page.goto("/en/creator/earnings");

  await expect(
    page.getByRole("heading", { name: "Performance" }),
  ).toBeVisible();
  await expect(page.getByText("Recorded clicks").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Daily trend" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Where the result came from" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Earnings ledger" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Click ledger" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#click-ledger span:visible, #click-ledger p:visible")
      .filter({ hasText: "ck_phase6_seeded" })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator("tr:visible, article:visible")
      .filter({ hasText: "PHASE6-SEED-1234" })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/previous period/).first()).toBeVisible();

  const today = await page.evaluate(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tbilisi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  await page.getByLabel("Period", { exact: true }).selectOption("custom");
  await page.locator("#performance-from").fill(today);
  await page.locator("#performance-to").fill(today);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/period=custom/);
  await expect(page).toHaveURL(new RegExp(`from=${today}`));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^shuamo-performance-.*\.csv$/);
  const downloadStream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of downloadStream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"Occurred at (UTC)"');
  // The seeded order can predate today when a persistent dev database is reused.
  // Inspect its immutable historical row through an all-time export instead.
  const history = await page.request.get("/api/performance/export?period=all");
  expect(history.status()).toBe(200);
  expect(await history.text()).toContain('"PHASE6-SEED-1234"');

  await page.getByLabel("Period", { exact: true }).selectOption("7d");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/period=7d/);

  if ((page.viewportSize()?.width ?? 1_000) < 768) {
    await page.getByRole("link", { name: "Tracking links" }).first().click();
    const sourceRow = page
      .locator("#breakdown a")
      .filter({ hasText: "Converted clicks" })
      .first();
    await expect(sourceRow).toContainText("Converted clicks");
    await expect(sourceRow).not.toContainText("Pending");
    await expect(sourceRow).toContainText("Confirmed");
  }

  await page.goto("/en/creator/links");
  const performanceLink = page
    .getByRole("link", { name: "View performance" })
    .first();
  await expect(performanceLink).toBeVisible();
  await performanceLink.click();
  await expect(page).toHaveURL(/\/en\/creator\/earnings\?link=/);
  await expect(
    page.getByRole("heading", { name: "Performance" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectAccessible(page);
  await page.goto("/ka/creator/earnings");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectAccessible(page);
});

test("@phase-6 brand performance reports products, creators, sales, and commission", async ({
  page,
}) => {
  await signIn(page, BRAND);
  await page.goto("/en/brand/performance");

  await expect(
    page.getByRole("heading", { name: "Performance" }),
  ).toBeVisible();
  await expect(page.getByText("Attributed sales").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Creators" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Products" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tracking links" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Earnings ledger" }),
  ).toBeVisible();
  await expectAccessible(page);

  await page.goto("/en/brand/links");
  const performanceLinks = page.getByRole("link", {
    name: "View performance",
  });
  const visibleLinkCount = await performanceLinks.count();
  expect(visibleLinkCount).toBeGreaterThan(0);
  expect(visibleLinkCount).toBeLessThanOrEqual(12);
  await performanceLinks.first().click();
  await expect(page).toHaveURL(
    /\/en\/brand\/performance\?link=.+&view=links#breakdown$/,
  );
  await expect(
    page.getByRole("heading", { name: "Performance" }),
  ).toBeVisible();
});
