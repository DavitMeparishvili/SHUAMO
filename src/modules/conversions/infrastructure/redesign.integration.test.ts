import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedCreator, seedLink } from "@/src/test/fixtures/accounts";
import {
  creatorPerformanceReport,
  brandPerformanceReport,
} from "./prisma-performance-repository";
import { performanceLedgerCsv } from "../application/performance-ledger-csv";

describe("redesigned financial drilldowns", () => {
  it("reconciles sales, reversals and dates while preserving accepted terms and owner scope", async () => {
    const f = await seedLink(),
      other = await seedBrand(),
      foreign = await seedCreator();
    await prisma.trackingLink.update({
      where: { id: f.link.id },
      data: { status: "DISABLED" },
    });
    f.link = await prisma.trackingLink.create({
      data: {
        productId: f.product.id,
        creatorId: f.creator.id,
        code: "STAGED02",
        commissionType: "FIXED",
        commissionValue: "10",
        acceptedTerms: { cookieWindowDays: 30, termsVersion: 2 },
      },
    });
    const saleDate = new Date("2026-01-02T10:00:00Z"),
      now = new Date("2026-09-06T10:00:00Z");
    await prisma.click.create({
      data: {
        id: "ck_redesign_test",
        trackingLinkId: f.link.id,
        brandId: f.brand.id,
        occurredAt: new Date("2026-01-01T22:00:00Z"),
      },
    });
    const cv = await prisma.conversion.create({
      data: {
        brandId: f.brand.id,
        orderId: "REDESIGN-1",
        requestFingerprint: "a".repeat(64),
        occurredAt: saleDate,
        confirmedAt: saleDate,
        status: "CANCELLED",
        items: {
          create: {
            sku: f.product.sku,
            qty: 1,
            unitPrice: "100",
            lineDiscount: "0",
            lineVat: "0",
            commissionableNet: "100",
            attribution: {
              create: {
                clickId: "ck_redesign_test",
                creatorId: f.creator.id,
                productId: f.product.id,
                commissionAmount: "10",
              },
            },
          },
        },
      },
      include: { items: { include: { attribution: true } } },
    });
    await prisma.auditEvent.create({
      data: {
        entityType: "conversion",
        entityId: cv.id,
        action: "conversion.cancelled",
        changes: { from: "CONFIRMED", to: "CANCELLED" },
        at: new Date("2026-09-05T12:00:00Z"),
      },
    });
    await prisma.product.update({
      where: { id: f.product.id },
      data: { commissionValue: "90", termsVersion: 7 },
    });
    const saleId = cv.items[0]!.attribution!.id;
    const creator = await creatorPerformanceReport(
      f.creator.id,
      { period: "all", saleId },
      now,
    );
    const brand = await brandPerformanceReport(
      f.brand.id,
      { period: "all" },
      now,
    );
    expect(creator.totals).toEqual(brand.totals);
    expect(creator.totals).toMatchObject({
      confirmed: "0.00",
      cancelled: "10.00",
      confirmedSales: 0,
      cancelledSales: 1,
    });
    expect(creator.sale).toMatchObject({
      commissionValue: "10",
      commissionAmount: "10.00",
      termsVersion: 2,
      cookieWindowDays: 30,
      cancelledAt: "2026-09-05T12:00:00.000Z",
    });
    expect(creator.trend[0]?.date).toBe("2026-01-02");
    const recent = await creatorPerformanceReport(
      f.creator.id,
      { period: "7d" },
      now,
    );
    expect(recent.ledger.rows).toHaveLength(0);
    expect(recent.activity).toContainEqual(
      expect.objectContaining({ kind: "reversed", amount: "10.00", saleId }),
    );
    expect(
      (
        await creatorPerformanceReport(
          foreign.id,
          { period: "all", saleId },
          now,
        )
      ).sale,
    ).toBeUndefined();
    expect(
      (await brandPerformanceReport(other.id, { period: "all", saleId }, now))
        .sale,
    ).toBeUndefined();
    expect(performanceLedgerCsv(creator.ledger.rows)).toContain(
      '"10.00","10.00","0.00"',
    );
    const inactive = await creatorPerformanceReport(
      f.creator.id,
      { period: "all", linkStatus: "DISABLED" },
      now,
    );
    expect(inactive.totals.clicks).toBe(0);
    await prisma.partnership.update({
      where: { id: f.partnership.id },
      data: { status: "REJECTED" },
    });
    expect(
      (
        await creatorPerformanceReport(
          f.creator.id,
          { period: "all", linkStatus: "DISABLED" },
          now,
        )
      ).totals.clicks,
    ).toBe(1);
    const wide = await creatorPerformanceReport(
      f.creator.id,
      { period: "custom", from: "1970-01-01", to: "2026-09-06" },
      now,
    );
    expect(wide.trend.length).toBeLessThanOrEqual(90);
    expect(wide.trend.reduce((sum, p) => sum + p.orders, 0)).toBe(
      wide.totals.orders,
    );
  });
});
