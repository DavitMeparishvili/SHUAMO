import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedLink } from "@/src/test/fixtures/accounts";
import {
  brandPerformanceReport,
  creatorPerformanceLedgerExport,
  creatorLinkPerformanceSnapshots,
  creatorPerformanceReport,
} from "./prisma-performance-repository";

const NOW = new Date("2026-09-02T12:00:00.000Z");

async function earning({
  brandId,
  creatorId,
  productId,
  sku,
  clickId,
  status,
  orderId,
  occurredAt,
  commission,
  net,
}: {
  brandId: string;
  creatorId: string;
  productId: string;
  sku: string;
  clickId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  orderId: string;
  occurredAt: Date;
  commission: string;
  net: string;
}) {
  return prisma.conversion.create({
    data: {
      brandId,
      orderId,
      requestFingerprint: "a".repeat(64),
      occurredAt,
      status,
      ...(status === "CONFIRMED" ? { confirmedAt: occurredAt } : {}),
      items: {
        create: {
          sku,
          qty: 1,
          unitPrice: net,
          lineDiscount: "0.00",
          lineVat: "0.00",
          commissionableNet: net,
          attribution: {
            create: {
              clickId,
              creatorId,
              productId,
              commissionAmount: commission,
            },
          },
        },
      },
    },
  });
}

describe("performance reporting", () => {
  it("keeps creator and brand totals traceable to links, clicks, and earning rows", async () => {
    const fixture = await seedLink();
    const clicks = await Promise.all([
      prisma.click.create({
        data: {
          id: "ck_performance_pending",
          trackingLinkId: fixture.link.id,
          brandId: fixture.brand.id,
          occurredAt: new Date("2026-09-01T09:00:00.000Z"),
        },
      }),
      prisma.click.create({
        data: {
          id: "ck_performance_confirmed",
          trackingLinkId: fixture.link.id,
          brandId: fixture.brand.id,
          occurredAt: new Date("2026-08-31T09:00:00.000Z"),
        },
      }),
      prisma.click.create({
        data: {
          id: "ck_performance_old",
          trackingLinkId: fixture.link.id,
          brandId: fixture.brand.id,
          occurredAt: new Date("2026-07-15T09:00:00.000Z"),
        },
      }),
    ]);
    await Promise.all([
      earning({
        brandId: fixture.brand.id,
        creatorId: fixture.creator.id,
        productId: fixture.product.id,
        sku: fixture.product.sku,
        clickId: clicks[0]!.id,
        status: "PENDING",
        orderId: "PERF-PENDING",
        occurredAt: new Date("2026-09-01T10:00:00.000Z"),
        commission: "10.00",
        net: "90.00",
      }),
      earning({
        brandId: fixture.brand.id,
        creatorId: fixture.creator.id,
        productId: fixture.product.id,
        sku: fixture.product.sku,
        clickId: clicks[1]!.id,
        status: "CONFIRMED",
        orderId: "PERF-CONFIRMED",
        occurredAt: new Date("2026-08-31T10:00:00.000Z"),
        commission: "12.00",
        net: "100.00",
      }),
    ]);

    const [creator, brand, snapshots] = await Promise.all([
      creatorPerformanceReport(fixture.creator.id, { period: "30d" }, NOW),
      brandPerformanceReport(fixture.brand.id, { period: "30d" }, NOW),
      creatorLinkPerformanceSnapshots(
        fixture.creator.id,
        [fixture.link.id],
        NOW,
      ),
    ]);

    expect(creator.totals).toEqual({
      clicks: 2,
      convertedClicks: 2,
      orders: 2,
      units: 2,
      convertedClickRate: 1,
      sales: "190.00",
      pending: "10.00",
      confirmed: "12.00",
      cancelled: "0.00",
    });
    expect(brand.totals).toEqual(creator.totals);
    expect(creator.comparison).toMatchObject({
      clicks: 1,
      orders: 0,
      confirmed: "0.00",
    });
    expect(creator.breakdowns.brands[0]).toMatchObject({
      id: fixture.brand.id,
      clicks: 2,
      orders: 2,
      confirmed: "12.00",
    });
    expect(brand.breakdowns.creators[0]).toMatchObject({
      id: fixture.creator.id,
      clicks: 2,
      orders: 2,
    });
    expect(creator.ledger.rows.map((row) => row.orderId)).toEqual([
      "PERF-PENDING",
      "PERF-CONFIRMED",
    ]);
    expect(creator.ledger.rows[0]).toMatchObject({
      linkId: fixture.link.id,
      clickId: "ck_performance_pending",
      productId: fixture.product.id,
      commissionableNet: "90.00",
    });
    expect(creator.clickLedger.rows.map((row) => row.id)).toEqual([
      "ck_performance_pending",
      "ck_performance_confirmed",
    ]);
    expect(creator.clickLedger.rows[0]).toMatchObject({
      linkCode: fixture.link.code,
      orderIds: ["PERF-PENDING"],
    });
    expect(snapshots.get(fixture.link.id)).toMatchObject({
      clicks: 2,
      orders: 2,
      confirmed: "12.00",
    });

    const [custom, exported] = await Promise.all([
      creatorPerformanceReport(
        fixture.creator.id,
        { period: "custom", from: "2026-08-31", to: "2026-09-01" },
        NOW,
      ),
      creatorPerformanceLedgerExport(
        fixture.creator.id,
        { period: "30d" },
        NOW,
      ),
    ]);
    expect(custom.totals).toMatchObject({ clicks: 2, orders: 2 });
    expect(custom.trend).toHaveLength(2);
    expect(exported.rows.map((row) => row.orderId)).toEqual([
      "PERF-PENDING",
      "PERF-CONFIRMED",
    ]);
    const clickDrilldown = await creatorPerformanceReport(
      fixture.creator.id,
      { period: "30d", ledgerQuery: "ck_performance_pending" },
      NOW,
    );
    expect(clickDrilldown.ledger.rows.map((row) => row.orderId)).toEqual([
      "PERF-PENDING",
    ]);
  });

  it("filters outcomes by status and never leaks another owner's activity", async () => {
    const fixture = await seedLink();
    const click = await prisma.click.create({
      data: {
        id: "ck_owner_scope",
        trackingLinkId: fixture.link.id,
        brandId: fixture.brand.id,
        occurredAt: new Date("2026-09-01T09:00:00.000Z"),
      },
    });
    await earning({
      brandId: fixture.brand.id,
      creatorId: fixture.creator.id,
      productId: fixture.product.id,
      sku: fixture.product.sku,
      clickId: click.id,
      status: "CONFIRMED",
      orderId: "OWNER-SCOPE",
      occurredAt: new Date("2026-09-01T10:00:00.000Z"),
      commission: "8.00",
      net: "80.00",
    });
    const foreignBrand = await seedBrand();

    const [pendingOnly, foreign] = await Promise.all([
      creatorPerformanceReport(
        fixture.creator.id,
        { period: "30d", status: "PENDING" },
        NOW,
      ),
      brandPerformanceReport(foreignBrand.id, { period: "all" }, NOW),
    ]);

    expect(pendingOnly.totals).toMatchObject({
      clicks: 1,
      convertedClicks: 0,
      orders: 0,
      confirmed: "0.00",
    });
    expect(pendingOnly.ledger.rows).toEqual([]);
    expect(pendingOnly.clickLedger.rows[0]).toMatchObject({
      id: "ck_owner_scope",
      orderIds: [],
    });
    expect(foreign.scope.links).toBe(0);
    expect(foreign.totals).toEqual({
      clicks: 0,
      convertedClicks: 0,
      orders: 0,
      units: 0,
      convertedClickRate: 0,
      sales: "0.00",
      pending: "0.00",
      confirmed: "0.00",
      cancelled: "0.00",
    });
  });

  it("counts successful attribution outcomes consistently at period boundaries", async () => {
    const fixture = await seedLink();
    const oldClick = await prisma.click.create({
      data: {
        id: "ck_before_performance_window",
        trackingLinkId: fixture.link.id,
        brandId: fixture.brand.id,
        occurredAt: new Date("2026-08-01T09:00:00.000Z"),
      },
    });
    await earning({
      brandId: fixture.brand.id,
      creatorId: fixture.creator.id,
      productId: fixture.product.id,
      sku: fixture.product.sku,
      clickId: oldClick.id,
      status: "CONFIRMED",
      orderId: "LATE-CONVERSION",
      occurredAt: new Date("2026-09-01T10:00:00.000Z"),
      commission: "9.00",
      net: "90.00",
    });

    const report = await creatorPerformanceReport(
      fixture.creator.id,
      { period: "7d" },
      NOW,
    );
    expect(report.totals).toMatchObject({
      clicks: 0,
      convertedClicks: 1,
      convertedClickRate: 0,
      orders: 1,
      confirmed: "9.00",
    });
    expect(report.clickLedger.rows).toEqual([]);
    expect(report.ledger.rows[0]?.orderId).toBe("LATE-CONVERSION");
  });
});
