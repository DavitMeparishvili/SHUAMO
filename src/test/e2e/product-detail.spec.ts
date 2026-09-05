import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const productPath = "/en/products/32000000-0000-4000-8000-000000000003";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: "nino@creators.ge", password: "seeded-password-01" },
  });
  expect(response.ok()).toBe(true);
}

test("product detail preserves usable desktop and mobile actions", async ({
  page,
  context,
}) => {
  await signIn(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(productPath);
  await expect(
    page.getByRole("heading", { name: "Your affiliate offer" }),
  ).toBeVisible();
  await expect(page.getByText("Link active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Copy tracking link", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /\/r\/P3C1X000$/,
  );
  const promotion = page.locator(".product-detail-term-group").nth(1);
  await promotion.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    promotion.getByText("Allowed channels", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enlarge selected product image" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
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
  await page.getByRole("link", { name: "Manage link", exact: true }).click();
  await expect(page).toHaveURL(/\/creator\/links\?brand=.*&q=CANDLE-01$/);
  await expect(
    page.locator("article").filter({ hasText: "Amber candle" }),
  ).toBeVisible();
});

test("product detail offers a manual fallback when clipboard access fails", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(productPath);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("Permission denied")),
      },
    }),
  );
  await page
    .getByRole("button", { name: "Copy tracking link", exact: true })
    .click();
  const manual = page.getByRole("textbox", {
    name: "Copy tracking link",
    exact: true,
  });
  await expect(manual).toBeVisible();
  await expect(manual).toHaveValue(/\/r\/P3C1X000$/);
});

test("product detail retains Georgian text and public access gating", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(productPath.replace("/en/", "/ka/"));
  await expect(page.locator(".product-detail-offer h2")).toHaveText(
    "თქვენი სააფილიო შეთავაზება",
  );
  await expect(page.locator(".product-detail-offer")).not.toContainText("???");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.context().clearCookies();
  await page.goto(productPath);
  await expect(
    page.getByText("Sign in to create a link", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy tracking link", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});
