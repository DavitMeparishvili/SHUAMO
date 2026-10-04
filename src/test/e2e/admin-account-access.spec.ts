import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const admin = {
  email: "finance-admin@example.test",
  password: "Finance-demo-only-2026!",
};

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function registerCreator(
  context: BrowserContext,
  baseURL: string,
  email: string,
  password: string,
  alias: string,
) {
  const signUp = await context.request.post("/api/auth/sign-up/email", {
    data: { name: alias, email, password, locale: "en" },
  });
  expect(signUp.status()).toBe(200);
  const registration = await context.request.post("/api/registration", {
    headers: { origin: new URL(baseURL).origin },
    data: {
      role: "creator",
      locale: "en",
      name: alias,
      alias,
      contactName: "",
      phone: "+995 555 12 34 56",
      country: "Georgia",
      city: "Tbilisi",
      category: "beauty",
      language: "both",
      description: "A creator profile submitted for administrator review.",
      audienceSize: "1000-10000",
      audienceCountry: "Georgia",
      instagram: "https://instagram.com/xurjin_access_review",
      tiktok: "",
      youtube: "",
      facebook: "",
      website: "",
    },
  });
  expect(registration.status()).toBe(201);
}

test("a new demo creator is active immediately and loses workspace access after deactivation", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120_000);
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/seed-finance.ts", "--reset"],
    { cwd: process.cwd(), env: process.env, stdio: "pipe" },
  );

  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `access-review-${suffix}@example.test`;
  const password = "Access-review-only-2026!";
  const alias = `Access Review ${suffix}`;
  const applicantContext = await browser.newContext({ baseURL: baseURL! });
  let applicant = await applicantContext.newPage();
  await registerCreator(applicantContext, baseURL!, email, password, alias);

  await applicant.goto("/en/workspace");
  await expect(applicant).toHaveURL(/\/en\/creator\/profile$/);

  await applicant.close();
  await applicantContext.clearCookies();
  applicant = await applicantContext.newPage();
  await signIn(applicant, email, password);
  await expect(applicant).toHaveURL(/\/en\/creator\/profile$/);

  await page.goto("/en/admin/login");
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/en/admin/finance");
  await page.goto(
    `/en/admin/finance?tab=creators&q=${encodeURIComponent(email)}`,
  );

  const mobile = testInfo.project.name.includes("mobile");
  const account = page
    .locator(
      mobile
        ? ".finance-mobile-cards article"
        : ".finance-desktop-table tbody tr",
    )
    .filter({ hasText: email });
  await expect(account).toBeVisible();
  await expect(account).toContainText("Active");
  await expect(account).toContainText("+995 555 12 34 56");

  await account.getByRole("link", { name: "Review profile" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/profiles\/creator\//);
  await expect(
    page
      .locator(".admin-profile-preview")
      .getByRole("heading", { level: 1, name: alias }),
  ).toBeVisible();
  await expect(
    page.getByText("A creator profile submitted for administrator review."),
  ).toBeVisible();
  await page.goBack();
  await expect(account).toBeVisible();

  await applicant.goto("/en/workspace");
  await expect(applicant).toHaveURL(/\/en\/creator\/profile$/);
  const forbidden = await applicantContext.request.patch(
    "/api/admin/accounts/creator/00000000-0000-4000-8000-000000000001/status",
    { data: { status: "APPROVED" } },
  );
  expect(forbidden.status()).toBe(403);

  await account
    .getByRole("button", { name: `Deactivate ${alias}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: `Deactivate ${alias}?` });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Deactivate account", exact: true })
    .click();
  await expect(account).toContainText("Deactivated");
  await expect(account).toContainText("links and history are unchanged");

  await applicant.goto("/en/workspace");
  await expect(applicant).toHaveURL(/\/en\/sign-in\?status=suspended/);
  await expect(applicant.getByRole("status")).toContainText(
    "An administrator must restore access",
  );

  await applicant.close();
  await applicantContext.clearCookies();
  applicant = await applicantContext.newPage();
  await signIn(applicant, email, password);
  await expect(applicant).toHaveURL(/\/en\/sign-in\?status=suspended/);

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
  await applicantContext.close();
});
