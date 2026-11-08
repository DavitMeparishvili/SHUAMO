import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = "Shop-demo-only-2026!";
const CREATOR = "shop-creator@example.test";
const PUBLIC = "/en/creators/shop-demo";

function seed(withShop = false) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/seed-creator-shop.ts",
        ...(withShop ? ["--with-shop"] : []),
      ],
      { cwd: process.cwd(), env: process.env, encoding: "utf8" },
    ),
  ) as { slug: string; codes: string[] };
}

async function signIn(page: Page) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(CREATOR);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"));
}

/** Open the profile editor's Shop tab (published profiles open in preview). */
async function openShopTab(page: Page) {
  await page.goto("/en/creator/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "My shop" }),
  ).toBeVisible();
}

function rows(page: Page) {
  return page.locator(".shop-editor-list > li");
}

async function rowNames(page: Page) {
  return rows(page).locator(".shop-editor-name").allTextContents();
}

async function expectSaved(page: Page) {
  await expect(page.locator(".shop-editor-status")).toContainText("Saved");
}

async function axe(page: Page) {
  return (
    await new AxeBuilder({ page })
      .include("#main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
  ).violations;
}

test("creator builds a shop and followers see it", async ({ page }) => {
  test.setTimeout(180_000);
  seed();
  await signIn(page);
  await openShopTab(page);

  // 1. Add every product with a link, including the ended offer.
  await page.getByRole("button", { name: "Add products" }).first().click();
  const picker = page.getByRole("dialog", { name: "Add products" });
  const boxes = picker.getByRole("checkbox");
  await expect(boxes).toHaveCount(16);
  for (const box of await boxes.all()) await box.check();
  await picker.getByRole("button", { name: "Add (16)" }).click();
  await expectSaved(page);
  await expect(rows(page)).toHaveCount(16);
  await expect(
    rows(page).filter({ hasText: "Shop demo ended offer" }),
  ).toContainText("Offer ended · not shown");
  // Newest link first: the ended offer, then items 15 … 1.
  const added = await rowNames(page);
  expect(added[0]).toBe("Shop demo ended offer");
  expect(added[15]).toBe("Shop demo item 01");

  // 2. Hide item 01.
  await rows(page)
    .filter({ hasText: "Shop demo item 01" })
    .getByRole("switch", { name: "Show on profile" })
    .click();
  await expectSaved(page);
  await expect(page.getByText("14 shown on profile · 1 hidden")).toBeVisible();

  // 3. Move the last shown item (02) to the top through its ⋯ menu.
  await page
    .getByRole("button", { name: "More actions for Shop demo item 02" })
    .click();
  await page
    .getByRole("dialog", { name: "More actions for Shop demo item 02" })
    .getByRole("button", { name: "Move to top" })
    .click();
  await expectSaved(page);
  expect((await rowNames(page))[0]).toBe("Shop demo item 02");
  expect(await axe(page)).toEqual([]);

  // 4. Everything persists.
  await page.reload();
  await openShopTab(page);
  const persisted = await rowNames(page);
  expect(persisted[0]).toBe("Shop demo item 02");
  expect(persisted[1]).toBe("Shop demo ended offer");
  await expect(
    rows(page).filter({ hasText: "Shop demo item 01" }).getByRole("switch"),
  ).toHaveAttribute("aria-checked", "false");

  // 5. Followers see the shop first, in order, without hidden or ended items.
  await page.goto(PUBLIC);
  const shopHeading = page.getByRole("heading", { name: /Shop my picks/ });
  await expect(shopHeading).toBeVisible();
  const order = await page.evaluate(() => {
    const heading = document.getElementById("creator-shop-heading");
    const about = document.querySelector(".creator-about");
    return Boolean(
      heading &&
      about &&
      heading.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(order).toBe(true);
  const cards = page.locator(".creator-shop-grid a");
  await expect(cards.first()).toHaveAttribute("href", "/r/SHPDM002");
  await expect(cards.filter({ visible: true })).toHaveCount(12);
  await page.getByRole("button", { name: "Show more (2)" }).click();
  await expect(cards.filter({ visible: true })).toHaveCount(14);
  await expect(page.locator('a[href="/r/SHPDM001"]')).toHaveCount(0);
  await expect(page.locator('a[href="/r/SHPDMEND"]')).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});

test("card goes through the tracked redirect", async ({ page }) => {
  seed(true);
  await page.goto(PUBLIC);
  const href = await page
    .locator(".creator-shop-grid a")
    .first()
    .getAttribute("href");
  expect(href).toMatch(/\/r\/[A-Za-z0-9]+$/);
  const response = await page.request.get(href!, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toContain(
    "https://example.test/shop-demo/1",
  );
});

test("no horizontal scroll and names clamp on phones", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone layout only");
  seed(true);
  await page.goto(PUBLIC);
  await expect(page.locator(".creator-shop")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const name = page
    .locator(".creator-shop-name")
    .filter({ hasText: "ხელნაკეთი" });
  const fits = await name.evaluate((element) => {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    return element.getBoundingClientRect().height <= 2 * lineHeight + 1;
  });
  expect(fits).toBe(true);
  // Every card is a comfortable tap target.
  const heights = await page
    .locator(".creator-shop-grid a")
    .filter({ visible: true })
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height),
    );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

  await signIn(page);
  await openShopTab(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("drag reorders on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "mouse drag is a desktop path");
  seed(true);
  await signIn(page);
  await openShopTab(page);
  const handle = page.getByRole("button", {
    name: "Reorder Shop demo item 03",
  });
  const first = rows(page).first();
  const from = (await handle.boundingBox())!;
  const to = (await first.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 12 });
  await page.mouse.up();
  await expectSaved(page);
  await page.reload();
  await openShopTab(page);
  expect((await rowNames(page))[0]).toBe("Shop demo item 03");
});

test("ka locale renders the shop heading", async ({ page }) => {
  seed(true);
  await page.goto("/ka/creators/shop-demo");
  await expect(
    page.getByRole("heading", { name: /ჩემი რჩეული პროდუქტები/ }),
  ).toBeVisible();
});
