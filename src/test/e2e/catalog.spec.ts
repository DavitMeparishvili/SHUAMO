import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const BRAND = { email: "brand@aromashop.ge", password: "seeded-password-01" };
const CREATOR = { email: "nino@creators.ge", password: "seeded-password-01" };
const RUN_ID = Date.now();

function creatorOfferTitle(projectName: string, kind: "chosen" | "untouched") {
  return `${kind === "chosen" ? "Chosen" : "Untouched"} creator offer ${projectName}-${RUN_ID}`;
}

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

test("@phase-3 brand publishes a product without creating creator links", async ({
  page,
}, testInfo) => {
  await signIn(page, "en", BRAND);
  for (const kind of ["chosen", "untouched"] as const) {
    await page.goto("/en/brand/products/new");
    await page
      .getByLabel("SKU")
      .fill(`P-E2E-${kind}-${testInfo.project.name}-${RUN_ID}`);
    await page
      .getByLabel("Title")
      .fill(creatorOfferTitle(testInfo.project.name, kind));
    await page.getByLabel("Price").fill("100.00");
    await page
      .getByLabel("Backlink URL")
      .fill(`https://aromashop.ge/p/${kind}`);
    await page.getByRole("radio", { name: "%" }).check();
    await page.getByLabel(/commission value/i).fill("10");
    await page.getByRole("button", { name: /publish product/i }).click();
    await expect(
      page.getByText(/approved creators can now choose it/i),
    ).toBeVisible();
  }
});

test("@phase-3 a creator explicitly accepts one product rate", async ({
  page,
}, testInfo) => {
  const chosenProduct = creatorOfferTitle(testInfo.project.name, "chosen");
  const otherProduct = creatorOfferTitle(testInfo.project.name, "untouched");
  const agreedRate = "10%";

  await signIn(page, "en", CREATOR);
  await page.goto("/en/creator/links");
  const chosenOffer = page
    .locator("article")
    .filter({ hasText: chosenProduct });
  await expect(chosenOffer).toContainText(agreedRate);
  await chosenOffer
    .getByRole("button", { name: "Create link at this rate" })
    .click();

  const agreedLink = page.locator("article").filter({ hasText: chosenProduct });
  await expect(agreedLink.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(agreedLink).toContainText(agreedRate);
  await expect(
    page.locator("article").filter({ hasText: otherProduct }),
  ).toContainText("Create link at this rate");

  await page.context().clearCookies();
  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/products");
  await page
    .getByRole("link", {
      name: `P-E2E-chosen-${testInfo.project.name}-${RUN_ID}`,
    })
    .click();
  const creatorLinks = page.locator("#creator-links");
  await expect(
    creatorLinks.getByRole("heading", { name: "Creator links" }),
  ).toBeVisible();
  const creatorLink = creatorLinks
    .locator("article")
    .filter({ hasText: "Nino" });
  await expect(creatorLink).toContainText(agreedRate);
  await expect(creatorLink.getByRole("button", { name: "Copy" })).toBeVisible();
});

test("@phase-3 archiving preserves links and reports PRODUCT_ARCHIVED", async ({
  page,
}, testInfo) => {
  await signIn(page, "en", BRAND);
  const productId = testInfo.project.name.includes("mobile")
    ? "32000000-0000-4000-8000-000000000002"
    : "32000000-0000-4000-8000-000000000001";
  await page.goto(`/en/brand/products/${productId}`);
  await page.getByRole("button", { name: "Archive product" }).click();
  await expect(page.getByText("Product archived").first()).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, "ka", CREATOR);
  await page.goto("/ka/creator/links");
  await expect(page.getByText("პროდუქტი დაარქივებულია").first()).toBeVisible();
});

test("@phase-3 presign routes require a real owned product", async ({
  page,
}) => {
  await signIn(page, "en", BRAND);
  for (const id of ["new", "00000000-0000-4000-8000-000000000000"]) {
    const response = await page.request.post(
      `/api/brand/products/${id}/images/presign`,
      { data: { contentType: "image/jpeg" } },
    );
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  }
});

test("@phase-3 a brand uploads a product photo through the presigned MinIO flow", async ({
  page,
  request,
}, testInfo) => {
  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/products/new");
  await page
    .getByLabel("SKU")
    .fill(`P-IMAGE-${testInfo.project.name}-${Date.now()}`);
  await page.getByLabel("Title").fill("Image product");
  await page.getByLabel("Price").fill("100.00");
  await page.getByLabel("Backlink URL").fill("https://aromashop.ge/p/image");
  await page.getByRole("radio", { name: "%" }).check();
  await page.getByLabel(/commission value/i).fill("10");
  await expect(page.getByLabel(/add image/i)).toHaveCount(0);
  await page.getByRole("button", { name: /publish product/i }).click();
  await expect(page).toHaveURL(/\/en\/brand\/products\/[^?]+\?created=1/);

  await page.getByLabel(/add image/i).setInputFiles({
    name: "perfume.jpg",
    mimeType: "image/jpeg",
    buffer: readFileSync("src/test/fixtures/perfume.jpg"),
  });
  const thumbnail = page.getByRole("img", { name: /perfume\.jpg/i });
  await expect(thumbnail).toBeVisible();
  await expect(thumbnail).toHaveAttribute(
    "src",
    /^http:\/\/localhost:9000\/shuamo-product-images\//,
  );
  const publicUrl = await thumbnail.getAttribute("src");
  expect(publicUrl).not.toBeNull();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await page.reload();
  await expect(page.getByRole("img", { name: /add image 1/i })).toBeVisible();

  const anonymousGet = await request.get(publicUrl!);
  expect(anonymousGet.status()).toBe(200);
  const unsignedPut = await request.put(publicUrl!, {
    data: Buffer.from("not-authorized"),
    headers: { "content-type": "image/jpeg" },
  });
  expect(unsignedPut.status()).toBe(403);
});

test("@phase-3 a brand can govern one link and remove a partnership without deletion", async ({
  page,
}) => {
  await signIn(page, "en", BRAND);
  await page.goto("/en/brand/links");
  const link = page
    .locator("article")
    .filter({ hasText: "Amber candle" })
    .first();
  await expect(link).toContainText("Active");
  await link.getByRole("button", { name: "Disable link" }).click();
  await expect(link).toContainText("Link disabled");
  await link.getByRole("button", { name: "Enable link" }).click();
  await expect(link).toContainText("Active");

  await page.goto("/en/brand/creators");
  const partnership = page
    .locator("article")
    .filter({ hasText: "Nino" })
    .first();
  await partnership.getByRole("button", { name: "Remove creator" }).click();
  await expect(partnership).toContainText("Rejected");
  await partnership
    .getByRole("button", { name: "Restore partnership" })
    .click();
  await expect(partnership).toContainText("Approved");
});
