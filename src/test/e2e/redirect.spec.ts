import { expect, test } from "@playwright/test";
import { measureRedirectLatency } from "@/scripts/measure-redirect-latency";
import { observeClickFromSeparateConnection } from "@/src/infrastructure/e2e/click-observer";

const LIVE = "P4ACTV01";
const OTHER = "P4ACTV02";
const DISABLED = "P4END001";

test("@phase-4 a real click lands on the seeded destination with xu", async ({
  page,
}) => {
  await page.goto(`/r/${LIVE}`);
  await expect(page).toHaveURL(/\/test-shop\?xu=ck_[0-9a-f]{12}$/);
  await expect(page.getByText("Seeded shop destination")).toBeVisible();
});

test("@phase-4 HTTP redirect commits before a second connection observes it", async ({
  request,
}) => {
  const response = await request.get(`/r/${LIVE}`, { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  const location = response.headers().location;
  if (location === undefined) throw new Error("redirect omitted Location");
  const clickId = new URL(location).searchParams.get("xu");
  expect(clickId).toMatch(/^ck_[0-9a-f]{12}$/);

  // No retry or polling: visibility must hold when the HTTP response exists.
  const observed = await observeClickFromSeparateConnection(clickId!);
  expect(observed?.id).toBe(clickId);
});

test("@phase-4 the visitor cookie is set once and reused", async ({
  page,
  context,
}) => {
  await page.goto(`/r/${LIVE}`);
  const first = (await context.cookies()).find(
    (cookie) => cookie.name === "xu_vid",
  );
  expect(first).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });

  await page.goto(`/r/${OTHER}`);
  const second = (await context.cookies()).find(
    (cookie) => cookie.name === "xu_vid",
  );
  expect(second?.value).toBe(first?.value);
});

test("@phase-4 response traces echo no raw IP or User-Agent", async ({
  request,
}) => {
  const rawIp = "198.51.100.77";
  const rawAgent = "privacy-trace-agent/31.146";
  const response = await request.get(`/r/${LIVE}`, {
    headers: { "X-Real-IP": rawIp, "User-Agent": rawAgent },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
  const trace = JSON.stringify({
    headers: response.headers(),
    body: await response.text(),
  });
  expect(trace).not.toContain(rawIp);
  expect(trace).not.toContain(rawAgent);
});

for (const locale of ["ka", "en"] as const) {
  test(`@phase-4 ${locale} disabled links show a reason at HTTP 200`, async ({
    page,
  }) => {
    const redirect = await page.request.get(`/r/${DISABLED}`, {
      headers: { "Accept-Language": locale },
      maxRedirects: 0,
    });
    expect(redirect.status()).toBe(302);
    const location = redirect.headers().location;
    expect(location).toBe(`/${locale}/offer-ended?reason=LINK_DISABLED`);
    if (location === undefined) throw new Error("redirect omitted Location");
    const response = await page.goto(location);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("main")).toContainText(
      locale === "ka" ? "შეთავაზება დასრულდა" : "This offer has ended",
    );
    await expect(page.getByRole("main")).toContainText(
      locale === "ka"
        ? "ეს კონკრეტული ბმული გამორთულია."
        : "This specific link has been switched off.",
    );
  });
}

test("@phase-4 disabled links do not write click rows", async ({ request }) => {
  const before = (await (
    await request.get("/api/test/click-count")
  ).json()) as {
    count: number;
  };
  const response = await request.get(`/r/${DISABLED}`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
  const after = (await (await request.get("/api/test/click-count")).json()) as {
    count: number;
  };
  expect(after.count).toBe(before.count);
});

test("@phase-4 keeps redirect p95 under 50ms over 500 requests", async () => {
  const latency = await measureRedirectLatency({ requests: 500 });
  expect(latency.p95).toBeLessThan(50);
});
