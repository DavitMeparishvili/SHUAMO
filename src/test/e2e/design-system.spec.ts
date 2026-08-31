import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["ka", "en"] as const) {
  test(`@phase-1 ${locale} design system loads its local type system`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const fonts = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      faces: [...document.fonts].map((face) => face.family),
      money: getComputedStyle(
        document.querySelector<HTMLElement>("[data-amount]")!,
      ).fontFamily,
      size: document.fonts.size,
    }));

    expect(fonts.size).toBeGreaterThan(0);
    expect(fonts.body).toMatch(/Geist/i);
    expect(fonts.money).toMatch(/Geist/i);
    expect(
      fonts.faces.some((family) => /Noto Sans Georgian/i.test(family)),
    ).toBe(true);
  });

  test(`@phase-1 ${locale} design system has no accessibility violations`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test(`@phase-1 ${locale} design system is keyboard traversable`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    const interactive = page.locator(
      'a[href]:visible, button:not([disabled]):not([data-nextjs-dev-tools-button]):visible, input:not([disabled]):visible, select:not([disabled]):visible, [tabindex="0"]:visible',
    );
    await interactive.evaluateAll((elements) => {
      elements.forEach((element, index) => {
        element.setAttribute("data-e2e-tab-order", String(index));
      });
    });
    const expectedOrder = await interactive.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-e2e-tab-order")),
    );

    const actualOrder: (string | null)[] = [];
    for (const expected of expectedOrder) {
      await page.keyboard.press("Tab");
      const focused = page.locator("[data-e2e-tab-order]:focus");
      await expect(focused).toBeVisible();
      await expect(focused).toHaveCSS("outline-style", "solid");
      const actual = await focused.getAttribute("data-e2e-tab-order");
      expect(actual).toBe(expected);
      actualOrder.push(actual);
    }

    expect(actualOrder).toEqual(expectedOrder);
    expect(new Set(actualOrder).size).toBe(expectedOrder.length);
  });

  test(`@phase-1 ${locale} provenance link reveals its labelled rows`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    await page.locator('a[href$="#table"]').click();

    const target = page.locator("#table");
    await expect(target).toHaveAttribute("aria-labelledby", "table-heading");
    await expect
      .poll(async () => (await target.boundingBox())?.y ?? -1)
      .toBeGreaterThanOrEqual(65);
  });

  test(`@phase-1 ${locale} design system has route-specific metadata`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);

    await expect(page).toHaveTitle(
      locale === "en"
        ? "The trail behind every number | SHUAMO"
        : "კვალი ყოველი რიცხვის უკან | SHUAMO",
    );
  });

  test(`@phase-1 ${locale} design system matches its visual baseline`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/design`);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.evaluate(async () => {
        await document.fonts.ready;
      }),
    ]);

    await expect(page).toHaveScreenshot(`design-${locale}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
