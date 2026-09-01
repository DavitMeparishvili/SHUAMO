import { expect, test, type Page } from "@playwright/test";

const BRAND = { email: "brand@aromashop.ge", password: "seeded-password-01" };
const CREATOR = { email: "nino@creators.ge", password: "seeded-password-01" };
const SUSPENDED = {
  email: "suspended@aromashop.ge",
  password: "seeded-password-01",
};

async function signIn(
  page: Page,
  locale: "ka" | "en",
  user: { email: string; password: string },
) {
  await page.goto(`/${locale}/sign-in`);
  await page.getByLabel(locale === "ka" ? "ელფოსტა" : "Email").fill(user.email);
  await page
    .getByLabel(locale === "ka" ? "პაროლი" : "Password")
    .fill(user.password);
  await page
    .getByRole("button", { name: locale === "ka" ? "შესვლა" : "Sign in" })
    .click();
  await page.waitForURL((url) => {
    const finishedPath =
      url.pathname === `/${locale}/brand` ||
      url.pathname === `/${locale}/creator`;
    return finishedPath || url.searchParams.get("status") === "not-approved";
  });
}

for (const locale of ["ka", "en"] as const) {
  test(`@phase-2 ${locale} brand reaches its empty workspace`, async ({
    page,
  }) => {
    await signIn(page, locale, BRAND);
    await expect(page).toHaveURL(new RegExp(`/${locale}/brand$`));
    await expect(page.getByText("Aromashop")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
  });

  test(`@phase-2 ${locale} creator reaches its empty workspace`, async ({
    page,
  }) => {
    await signIn(page, locale, CREATOR);
    await expect(page).toHaveURL(new RegExp(`/${locale}/creator$`));
    await expect(page.getByText("Nino")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
  });
}

test("@phase-2 a creator cannot reach the brand workspace", async ({
  page,
}) => {
  await signIn(page, "en", CREATOR);
  await page.goto("/en/brand");
  await expect(page).toHaveURL(/\/en\/creator$/);
});

test("@phase-2 a suspended brand cannot reach a workspace", async ({
  page,
}) => {
  await signIn(page, "en", SUSPENDED);
  await expect(page).toHaveURL(/\/en\/sign-in/);
  await expect(page.getByRole("main")).not.toContainText("Suspended Shop");
});

test("@phase-2 an anonymous visitor is sent to sign-in", async ({ page }) => {
  await page.goto("/ka/brand");
  await expect(page).toHaveURL(/\/ka\/sign-in/);
});

test("@phase-2 locale switch preserves the authenticated path", async ({
  page,
}) => {
  await signIn(page, "ka", CREATOR);
  await page.getByRole("link", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/creator$/);
});

test("@phase-2 a brand generates a key that is shown once", async ({
  page,
}) => {
  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/settings");
  await page.getByRole("button", { name: "Generate a new key" }).click();
  await expect(page.getByText(/^xu_sk_[0-9A-HJ-NP-TV-Z]{8}_/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^xu_sk_[0-9A-HJ-NP-TV-Z]{8}_/)).toHaveCount(0);
  await expect(page.getByText(/^xu_sk_[0-9A-HJ-NP-TV-Z]{8}$/)).toBeVisible();
});
