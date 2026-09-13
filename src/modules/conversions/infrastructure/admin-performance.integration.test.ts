import { it, expect } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { financeFixture } from "@/src/test/fixtures/finance";
import { seedCreator } from "@/src/test/fixtures/accounts";
import { prismaAdminPerformance as reports } from "./prisma-admin-performance";
import type { AdminPerformanceQuery } from "../ports/admin-performance";
const query: AdminPerformanceQuery = {
  tab: "overview",
  from: "2026-09-01",
  to: "2026-09-30",
  productStatus: "ALL",
  q: "",
  sort: "sales_value",
  direction: "desc",
  page: 1,
};
it("reconciles products to overview without multiplying links or order items", async () => {
  const f = await financeFixture(),
    c = await seedCreator();
  await prisma.trackingLink.create({
    data: {
      productId: f.product.id,
      creatorId: c.id,
      code: "zero-link",
      commissionType: "FIXED",
      commissionValue: "1",
    },
  });
  await prisma.conversionItem.create({
    data: {
      conversionId: f.conversion.id,
      sku: "OTHER",
      qty: 1,
      unitPrice: "500",
      commissionableNet: "500",
      lineDiscount: "0",
      lineVat: "0",
    },
  });
  const overview = await reports.report(query),
    products = await reports.report({ ...query, tab: "products" });
  expect(overview.totals).toEqual({
    clicks: 1,
    salesCount: 1,
    salesValue: "3000.00",
    commission: "300.00",
  });
  expect(products.rows.items[0]).toMatchObject(overview.totals);
  const detail = await reports.productReport(f.product.id, query);
  expect(detail?.rows.items).toHaveLength(2);
  expect(detail?.rows.items.find((r) => r.id === c.id)?.salesCount).toBe(0);
});
it("includes archived, unlinked, disabled and zero rows; exports every page", async () => {
  const f = await financeFixture();
  await prisma.product.createMany({
    data: Array.from({ length: 25 }, (_, i) => ({
      brandId: f.brand.id,
      sku: `ZERO-${i}`,
      title: `Zero ${i}`,
      priceGel: "1",
      backlinkUrl: "https://example.test",
      commissionType: "FIXED" as const,
      commissionValue: "1",
      status: "ARCHIVED" as const,
    })),
  });
  await prisma.trackingLink.update({
    where: { id: f.link.id },
    data: { status: "DISABLED" },
  });
  const q = { ...query, tab: "products" as const, page: 2 };
  const r = await reports.report(q);
  expect(r.rows.total).toBe(26);
  expect(r.rows.items).toHaveLength(1);
  const exported = await reports.exportRows("products", q);
  expect(exported.rows).toHaveLength(26);
  expect(exported.total).toBe(26);
  const byCreator = await reports.report({
    ...q,
    page: 1,
    creatorId: f.creator.id,
  });
  expect(byCreator.rows.total).toBe(1);
  const detail = await reports.productReport(f.product.id, {
    ...q,
    page: 1,
    q: "does not match",
    productStatus: "ARCHIVED",
  });
  expect(detail?.product.id).toBe(f.product.id);
  expect(detail?.totals.commission).toBe("300.00");
  expect(await reports.productReport(crypto.randomUUID(), q)).toBeUndefined();
});
it("uses inclusive Tbilisi boundaries, occurrence dates, and current cancellation status", async () => {
  const f = await financeFixture();
  await prisma.conversion.update({
    where: { id: f.conversion.id },
    data: { occurredAt: new Date("2026-08-31T20:00:00Z") },
  });
  await prisma.click.update({
    where: { id: f.click.id },
    data: { occurredAt: new Date("2026-08-31T19:59:59Z") },
  });
  const result = await reports.report(query);
  expect(result.totals.salesCount).toBe(1);
  expect(result.totals.clicks).toBe(0);
  await prisma.conversion.update({
    where: { id: f.conversion.id },
    data: { occurredAt: new Date("2026-09-30T20:00:00Z") },
  });
  expect((await reports.report(query)).totals.salesCount).toBe(0);
  await prisma.conversion.update({
    where: { id: f.conversion.id },
    data: { occurredAt: new Date("2026-09-13"), status: "CANCELLED" },
  });
  expect((await reports.report(query)).totals.commission).toBe("0.00");
});
it("zero fills the full daily and monthly intervals", async () => {
  await financeFixture();
  const daily = await reports.report({
    ...query,
    from: "2026-07-01",
    to: "2026-10-01",
  });
  expect(daily.trend).toHaveLength(93);
  expect(daily.trend[0]?.from).toBe("2026-07-01");
  const monthly = await reports.report({
    ...query,
    from: "2025-01-15",
    to: "2026-10-03",
  });
  expect(monthly.trend).toHaveLength(22);
  expect(monthly.trend[0]?.from).toBe("2025-01-15");
  expect(monthly.trend.at(-1)?.to).toBe("2026-10-03");
  expect(monthly.trend.find((t) => t.from === "2026-09-01")?.commission).toBe(
    "300.00",
  );
});
it("bounds export fetches and reports the true count above 10,001", async () => {
  const f = await financeFixture();
  await prisma.product.createMany({
    data: Array.from({ length: 10001 }, (_, i) => ({
      brandId: f.brand.id,
      sku: `LIMIT-${i}`,
      title: `Limit ${i}`,
      priceGel: "1",
      backlinkUrl: "https://example.test",
      commissionType: "FIXED" as const,
      commissionValue: "1",
    })),
  });
  const result = await reports.exportRows("products", {
    ...query,
    tab: "products",
  });
  expect(result.rows).toHaveLength(10001);
  expect(result.total).toBe(10002);
});
