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

test("@phase-6 a posted exact-link order appears, confirms and reaches creator earnings", async ({
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
  const response = await request.post("/v1/conversions", {
    headers: { authorization: `Bearer ${KEY}` },
    data: {
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
    },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    orderId,
    status: "PENDING",
    commissionAmount: "10.00",
  });

  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/orders");
  const order = page.getByRole("article").filter({ hasText: `#${orderId}` });
  await expect(order.getByText("10.00 ₾").first()).toBeVisible();
  await order.getByRole("button", { name: "Confirm order" }).click();
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
});

test("@phase-6 an unattributed order stays visible without money actions", async ({
  page,
}) => {
  await signIn(page, "ka", BRAND);
  await page.goto("/ka/brand/orders");
  const order = page
    .getByRole("article")
    .filter({ hasText: "UNATTRIBUTED-ORDER" });
  await expect(order).toBeVisible();
  await expect(order.getByRole("button")).toHaveCount(0);
  await expect(order).toContainText("ატრიბუციის გარეშე");
  await expectNoAccessibilityViolations(page);
});
