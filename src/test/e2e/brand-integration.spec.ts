import { expect, test } from "@playwright/test";

for (const locale of ["en", "ka"] as const) {
  test(`brand integration validates without a sale in ${locale}`, async ({
    page,
    request,
  }) => {
    await page.goto("/en/sign-in");
    await page.getByLabel("Email").fill("brand@aromashop.ge");
    await page.getByLabel("Password").fill("seeded-password-01");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/en/brand");
    await page.goto(`/${locale}/brand/settings`);
    await expect(page.locator("h1")).toHaveText(
      locale === "en" ? "Integration" : "ინტეგრაცია",
    );
    await expect(page.locator("#api-key").getByRole("button")).toHaveCount(1);

    const redirect = await request.get("/r/P4ACTV01", { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    const clickId = new URL(redirect.headers().location!).searchParams.get(
      "xu",
    );
    const payload = {
      orderId: `VALIDATION-E2E-${crypto.randomUUID()}`,
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
    await page.locator("#conversion-payload").fill(JSON.stringify(payload));
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/brand/integration/validate") &&
        response.request().method() === "POST",
    );
    await page.locator("#validate button[type=submit]").click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      mode: "validation",
      valid: true,
      outcome: "eligible",
      commissionAmount: "10.00",
    });
    await expect(page.locator(".integration-result")).toContainText("10.00");
    await expect(page.locator("#requests tbody tr").first()).toContainText(
      "eligible",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.goto(
      `/${locale}/brand/orders?q=${encodeURIComponent(payload.orderId)}`,
    );
    await expect(page.locator("main")).not.toContainText(`#${payload.orderId}`);
  });
}
