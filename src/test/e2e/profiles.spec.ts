import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
async function signInBrand(page: import("@playwright/test").Page) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill("brand@aromashop.ge");
  await page.getByLabel("Password").fill("seeded-password-01");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/brand$/);
}
async function signInCreator(
  page: import("@playwright/test").Page,
  email = "dato@creators.ge",
) {
  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("seeded-password-01");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/creator\/profile$/);
}
test.describe("@phase-6.5 public profiles", () => {
  for (const locale of ["en", "ka"]) {
    test(`${locale} directories and profiles are public and accessible`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/brands`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto(`/${locale}/brands/aromashop`);
      await expect(page).toHaveTitle(/Aromashop/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/${locale}/brands/aromashop$`),
      );
      await expect(
        page.getByRole("heading", { name: "Aromashop", level: 1 }),
      ).toBeVisible();
      await page.goto(`/${locale}/creators/nino`);
      await expect(
        page.getByRole("heading", { name: "Nino", level: 1 }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
  test("draft suspended and unknown rows are indistinguishable", async ({
    request,
  }) => {
    for (const route of [
      "/en/creators/dato",
      "/en/brands/suspended-shop",
      "/en/creators/unknown",
    ]) {
      expect((await request.get(route)).status()).toBe(404);
    }
  });
  test("public HTML retains the direction contract and no private fields", async ({
    request,
  }) => {
    for (const route of ["/en/brands/aromashop", "/en/creators/nino"]) {
      const response = await request.get(route);
      const html = await response.text();
      expect(html).toContain(
        'data-profile-direction="phase-06-5-passport-proof-ledger"',
      );
      for (const forbidden of [
        "brand@aromashop",
        "xu_sk_",
        "payoutIban",
        "commissionValue",
        "priceGel",
        "requestFingerprint",
      ])
        expect(html).not.toContain(forbidden);
    }
  });
  test("anonymous profile sign-in returns to the profile", async ({ page }) => {
    await page.goto("/en/creators/nino");
    await page.getByRole("link", { name: "Sign in to connect" }).click();
    await expect(page).toHaveURL(
      /\/en\/sign-in\?returnTo=%2Fen%2Fcreators%2Fnino/,
    );
    await page.getByLabel("Email").fill("brand@aromashop.ge");
    await page.getByLabel("Password").fill("seeded-password-01");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/creators\/nino$/);
  });
  test("an owner uploads, saves, unpublishes and republishes the profile", async ({
    page,
  }) => {
    await signInBrand(page);
    await page.goto("/en/brand/profile");
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Cover image").setInputFiles({
      name: "profile.jpg",
      mimeType: "image/jpeg",
      buffer: readFileSync("src/test/fixtures/perfume.jpg"),
    });
    await expect(page.getByText("Upload complete.")).toBeVisible();
    await page
      .getByRole("button", { name: "Save and publish changes", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(
      page.locator('img[src*="profiles/brands/"]').first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page.locator(".profile-account-section summary").click();
    await page.getByRole("button", { name: "Unpublish profile" }).click();
    await expect(
      page.getByRole("button", { name: "Save and publish", exact: true }),
    ).toBeVisible();
    // A non-streaming response has the final status; browser streaming can commit 200 before notFound.
    expect(
      (
        await page.request.get("/en/brands/aromashop", {
          headers: { "user-agent": "Googlebot" },
        })
      ).status(),
    ).toBe(404);
    await page
      .getByRole("button", { name: "Save and publish", exact: true })
      .click();
    await expect(
      page.getByText("Your profile is public", { exact: true }),
    ).toBeVisible();
    await page.goto("/en/brands/aromashop");
    await expect(
      page.getByRole("heading", { name: "Aromashop", level: 1 }),
    ).toBeVisible();
  });

  test("a creator saves a slugless draft and manages ordered localized work", async ({
    page,
  }) => {
    await signInCreator(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Profile photo").setInputFiles({
      name: "creator-hero.jpg",
      mimeType: "image/jpeg",
      buffer: readFileSync("src/test/fixtures/perfume.jpg"),
    });
    await expect(page.getByText("Upload complete.")).toBeVisible();
    await page.getByLabel("Public profile address").clear();
    await page
      .getByRole("button", { name: "Featured work", exact: true })
      .click();
    const work = page.getByRole("group", { name: "Featured work" });
    while (await work.getByRole("button", { name: "Remove" }).count())
      await work.getByRole("button", { name: "Remove" }).first().click();
    await work.getByRole("button", { name: "Add featured work" }).click();
    await work.getByRole("button", { name: "Add featured work" }).click();
    await work.getByLabel("Title in Georgian").nth(0).fill("პირველი");
    await work.getByLabel("Title in English").nth(0).fill("First");
    await work
      .getByLabel("HTTPS destination")
      .nth(0)
      .fill("https://example.com/first");
    await work
      .getByLabel("Work image")
      .nth(0)
      .setInputFiles({
        name: "creator-work.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync("src/test/fixtures/perfume.jpg"),
      });
    await expect(work.getByText("Upload complete.")).toBeVisible();
    await work.getByLabel("Title in Georgian").nth(1).fill("მეორე");
    await work.getByLabel("Title in English").nth(1).fill("Second");
    await work
      .getByLabel("HTTPS destination")
      .nth(1)
      .fill("https://example.com/second");
    await work.getByRole("button", { name: "Move down" }).first().click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Public profile address")).toHaveValue("");
    await page
      .getByRole("button", { name: "Featured work", exact: true })
      .click();
    await expect(work.getByLabel("Title in English").first()).toHaveValue(
      "Second",
    );
    await expect(work.getByLabel("Title in Georgian").nth(1)).toHaveValue(
      "პირველი",
    );
  });
});
