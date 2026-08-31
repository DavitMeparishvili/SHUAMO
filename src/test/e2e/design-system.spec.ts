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

    const interactive = await page
      .locator(
        'a[href]:visible, button:not([disabled]):visible, input:not([disabled]):visible, select:not([disabled]):visible, [tabindex="0"]:visible',
      )
      .count();

    for (let index = 0; index < interactive; index += 1) {
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
      await expect(focused).toHaveCSS("outline-style", "solid");
    }
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
