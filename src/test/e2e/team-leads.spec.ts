import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = "Team-demo-only-2026!";
const LEAD = "team-lead@example.test";
const MEMBER = "team-member@example.test";

function seed() {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/seed-team-leads.ts"],
      { cwd: process.cwd(), env: process.env, encoding: "utf8" },
    ),
  ) as { lead: string; member: string; outsider: string };
}

async function signIn(page: Page, email: string) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"));
}

// The desktop rail is hidden on phones; there the item lives in "More".
async function myTeamLink(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "More" })
      .click();
    return page
      .getByRole("dialog")
      .getByRole("link", { name: "My team", exact: true });
  }
  return page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "My team", exact: true });
}

async function expectNoHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("a team lead sees only their own team and members do not", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120_000);
  const ids = seed();

  await signIn(page, LEAD);
  await page.goto("/en/creator/links");
  const nav = await myTeamLink(page, isMobile);
  await expect(nav).toBeVisible();
  await nav.click();
  await expect(page).toHaveURL(/\/en\/creator\/team$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "My team" }),
  ).toBeVisible();

  const rows = page.locator(
    isMobile ? ".finance-mobile-cards" : ".finance-desktop-table",
  );
  await expect(rows).toContainText("Levan Team Member");
  await expect(rows).not.toContainText("Ana Outsider");
  await expect(page.locator('a[href^="/en/admin"]')).toHaveCount(0);
  await expect(page.getByText("Platform payments")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expect(
    // Scoped to the page body: the shared top bar is not part of this
    // feature.
    (
      await new AxeBuilder({ page })
        .include("#main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await rows.getByRole("link", { name: "Levan Team Member" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/creator/team/${ids.member}`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Levan Team Member" }),
  ).toBeVisible();
  await expect(page.getByText("Paid in period", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Performance views" })
    .getByRole("link", { name: "Products" })
    .click();
  await expect(page).toHaveURL(/tab=products/);
  await expect(
    page.locator(isMobile ? ".finance-mobile-cards" : ".finance-desktop-table"),
  ).toContainText("Team demo candle");
  await expect(page.locator('a[href^="/en/admin"]')).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  const outsider = await page.goto(`/en/creator/team/${ids.outsider}`);
  expect(outsider?.status()).toBe(404);
  const malformed = await page.goto("/en/creator/team/not-a-creator");
  expect(malformed?.status()).toBe(404);

  await page.context().clearCookies();
  await signIn(page, MEMBER);
  await page.goto("/en/creator/links");
  if (isMobile)
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name: "More" })
      .click();
  await expect(page.locator('a[href="/en/creator/team"]')).toHaveCount(0);
  const denied = await page.goto("/en/creator/team");
  expect(denied?.status()).toBe(404);
});
