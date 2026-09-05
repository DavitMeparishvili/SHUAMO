import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BRAND = { email: "brand@aromashop.ge", password: "seeded-password-01" };
const CREATOR = { email: "nino@creators.ge", password: "seeded-password-01" };
const KEY = "xu_sk_BBBBBBBB_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

async function signIn(page: Page, locale: "ka" | "en", user: typeof BRAND) {
  await page.goto(`/${locale}/sign-in`);
  await page.getByLabel(locale === "ka" ? "ელფოსტა" : "Email").fill(user.email);
  await page
    .getByLabel(locale === "ka" ? "პაროლი" : "Password")
    .fill(user.password);
  await page
    .getByRole("button", { name: locale === "ka" ? "შესვლა" : "Sign in" })
    .click();
  await page.waitForURL(new RegExp(`/${locale}/(brand|creator)$`));
}

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("@phase-6 a posted exact-link order automatically earns commission without brand confirmation", async ({
  page,
  request,
}, testInfo) => {
  const orderId = `E2E-${testInfo.project.name}-${Date.now()}`;
  const redirect = await request.get("/r/P4ACTV01", { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  const location = redirect.headers().location;
  if (location === undefined) throw new Error("redirect omitted Location");
  const clickId = new URL(location).searchParams.get("xu");
  expect(clickId).toMatch(/^ck_[0-9a-f]{12}$/);
  const sale = {
    orderId,
    occurredAt: new Date().toISOString(),
    clickId,
    items: [
      {
        sku: "PHASE4-ACTIVE-1",
        qty: 1,
        unitPrice: "100.00",
        lineDiscount: "0.00",
        lineVat: "0.00",
      },
    ],
  };
  const response = await request.post("/v1/conversions", {
    headers: { authorization: `Bearer ${KEY}` },
    data: sale,
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    orderId,
    status: "CONFIRMED",
    commissionAmount: "10.00",
  });

  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/orders");
  const order = page.locator("details").filter({ hasText: `#${orderId}` });
  await expect(order.getByText("10.00 ₾").first()).toBeVisible();
  await expect(
    order.getByRole("button", { name: "Confirm order" }),
  ).toHaveCount(0);
  await expect(order.getByText("Confirmed")).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.context().clearCookies();
  await signIn(page, "en", CREATOR);
  await page.goto("/en/creator/earnings");
  const earning = page
    .locator("tr:visible, article:visible")
    .filter({ hasText: `#${orderId}` });
  await expect(earning.getByText("10.00 ₾")).toBeVisible();
  await expect(earning.getByText("Confirmed")).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.context().clearCookies();
  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/orders");
  const cancel = order.getByRole("button", { name: "Cancel / return order" });
  await order.locator("summary").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await cancel.click();
  await expect(order.getByText("Confirmed", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await cancel.click();
  await expect(order.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(cancel).toHaveCount(0);
  const replay = await request.post("/v1/conversions", {
    headers: { authorization: `Bearer ${KEY}` },
    data: sale,
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toMatchObject({
    status: "CANCELLED",
    commissionAmount: "10.00",
  });

  await page.context().clearCookies();
  await signIn(page, "en", CREATOR);
  await page.goto(
    `/en/creator/earnings?q=${encodeURIComponent(orderId)}&status=CANCELLED`,
  );
  await expect(earning.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(earning.getByText("10.00 ₾")).toBeVisible();
  await page.goto(
    `/en/creator/earnings?q=${encodeURIComponent(orderId)}&status=CONFIRMED`,
  );
  await expect(earning).toHaveCount(0);
});

test("@phase-6 an unattributed sale stays confirmed and cancellable", async ({
  page,
}) => {
  await signIn(page, "ka", BRAND);
  await page.goto("/ka/brand/orders");
  await page.getByRole("searchbox").fill("UNATTRIBUTED-ORDER");
  const order = page
    .locator("details")
    .filter({ hasText: "UNATTRIBUTED-ORDER" });
  await expect(order).toBeVisible();
  await order.locator("summary").click();
  await expect(order.getByRole("button")).toHaveCount(1);
  await expect(order).toContainText("შემქმნელის საკომისიოს გარეშე");
  await expectNoAccessibilityViolations(page);
});
