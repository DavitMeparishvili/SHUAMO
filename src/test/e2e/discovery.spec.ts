import { expect, test } from "@playwright/test";

test("discovery search follows browser history and retains an unmatched brand", async ({
  page,
}) => {
  await page.goto("/en/products");
  const search = page.getByRole("searchbox", { name: "Search products" });
  await search.fill("Amber");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Amber/);
  await search.fill("Citrus");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Citrus/);
  await page.goBack();
  await expect(search).toHaveValue("Amber");
  await page.goto(
    "/en/products?brand=22000000-0000-4000-8000-000000000001&q=no-matching-discovery-product",
  );
  if (test.info().project.name.includes("mobile")) {
    await page
      .getByRole("button", { name: "Filters (1)", exact: true })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("combobox", { name: "Brand", exact: true }),
    ).toHaveValue("22000000-0000-4000-8000-000000000001");
    await expect(
      page
        .getByRole("dialog")
        .getByRole("combobox", { name: "Brand", exact: true })
        .locator("option:checked"),
    ).toHaveText("Aromashop");
  } else {
    await expect(
      page
        .locator(".discovery-sidebar")
        .getByRole("combobox", { name: "Brand", exact: true }),
    ).toHaveValue("22000000-0000-4000-8000-000000000001");
  }
});

test("discovery mobile filters preview, cancel, apply and restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/products");
  const trigger = page.locator(".discovery-filter-trigger");
  await trigger.click();
  await page.locator('input[name="category-mobile"][value="beauty"]').check();
  const apply = page.getByRole("dialog").locator("footer button");
  const count = Number((await apply.innerText()).match(/\d+/)?.[0]);
  expect(count).toBeGreaterThan(0);
  await expect(page).not.toHaveURL(/category=/);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    page.locator('input[name="category-mobile"][value=""]'),
  ).toBeChecked();
  await page.locator('input[name="category-mobile"][value="beauty"]').check();
  await apply.click();
  await expect(page).toHaveURL(/category=beauty/);
  await expect(page.locator(".discovery-result-count")).toHaveText(
    `${count} products`,
  );
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear all" })
    .click();
  await apply.click();
  await expect(page).not.toHaveURL(/category=/);
});

test("discovery keyboard filters keep focus and compose with sorting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/products");
  const beauty = page.locator('input[name="category-desktop"][value="beauty"]');
  await beauty.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/category=beauty/);
  await expect(beauty).toBeFocused();
  await page.locator(".discovery-sort select").selectOption("price_low");
  await expect(page).toHaveURL(/category=beauty.*sort=price_low/);
  await expect(page.locator(".discovery-workspace")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const prices = (
    await page
      .locator(".discovery-terms > div:first-child dd")
      .allTextContents()
  ).map(Number.parseFloat);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
});

test("discovery saved products survive reload", async ({ page }) => {
  await page.goto("/en/products");
  const save = page.locator(".discovery-save").first();
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "false");
});
