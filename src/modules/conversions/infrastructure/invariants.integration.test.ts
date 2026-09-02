import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import { seedBrand, seedLink } from "@/src/test/fixtures/accounts";

async function seedConversionItem() {
  const brand = await seedBrand();
  const conversion = await prisma.conversion.create({
    data: {
      brandId: brand.id,
      orderId: crypto.randomUUID(),
      requestFingerprint: "a".repeat(64),
      occurredAt: new Date(),
    },
  });
  const item = await prisma.conversionItem.create({
    data: {
      conversionId: conversion.id,
      sku: "P-9",
      qty: 1,
      unitPrice: "10.00",
      lineDiscount: "0.00",
      lineVat: "0.00",
      commissionableNet: "10.00",
    },
  });
  return { brand, conversion, item };
}

describe("Phase 6 database constraints", () => {
  it("defaults a conversion to PENDING and enforces brand/order idempotency", async () => {
    const brand = await seedBrand();
    const data = {
      brandId: brand.id,
      orderId: "same-order",
      requestFingerprint: "b".repeat(64),
      occurredAt: new Date(),
    };
    const conversion = await prisma.conversion.create({ data });
    expect(conversion).toMatchObject({
      status: "PENDING",
      confirmedAt: null,
    });
    await expect(prisma.conversion.create({ data })).rejects.toThrow();
  });

  it("requires a lowercase SHA-256 request fingerprint", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.conversion.create({
        data: {
          brandId: brand.id,
          orderId: "bad-request-fingerprint",
          requestFingerprint: "not-a-sha256",
          occurredAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it("confirmed_at is set if and only if status is CONFIRMED", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.$executeRaw`
        INSERT INTO conversion
          (brand_id, order_id, request_fingerprint, occurred_at, status)
        VALUES (
          ${brand.id}::uuid, 'bad-confirmed', ${"c".repeat(64)}, now(), 'CONFIRMED'
        )
      `,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`
        INSERT INTO conversion
          (brand_id, order_id, request_fingerprint, occurred_at, status, confirmed_at)
        VALUES (
          ${brand.id}::uuid, 'bad-pending', ${"d".repeat(64)}, now(), 'PENDING', now()
        )
      `,
    ).rejects.toThrow();
  });

  it.each([
    ["qty", "0"],
    ["unit_price", "-1"],
    ["line_discount", "-1"],
    ["line_vat", "-1"],
    ["commissionable_net", "-1"],
  ])("rejects invalid conversion_item %s", async (column, value) => {
    const { conversion } = await seedConversionItem();
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO conversion_item
          (conversion_id, sku, qty, unit_price, line_discount, line_vat, commissionable_net)
         VALUES ($1::uuid, 'BAD', ${column === "qty" ? value : "1"},
           ${column === "unit_price" ? value : "1"},
           ${column === "line_discount" ? value : "0"},
           ${column === "line_vat" ? value : "0"},
           ${column === "commissionable_net" ? value : "1"})`,
        conversion.id,
      ),
    ).rejects.toThrow();
  });

  it("allows at most one attribution per conversion item and recorded click", async () => {
    const { brand, creator, product, link } = await seedLink();
    const click = await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        trackingLinkId: link.id,
        brandId: brand.id,
      },
    });
    const conversion = await prisma.conversion.create({
      data: {
        brandId: brand.id,
        orderId: "attribution-constraints",
        requestFingerprint: "e".repeat(64),
        occurredAt: new Date(),
      },
    });
    const item = await prisma.conversionItem.create({
      data: {
        conversionId: conversion.id,
        sku: product.sku,
        qty: 1,
        unitPrice: "10.00",
        lineDiscount: "0.00",
        lineVat: "0.00",
        commissionableNet: "10.00",
      },
    });
    const data = {
      conversionItemId: item.id,
      clickId: click.id,
      creatorId: creator.id,
      productId: product.id,
      commissionAmount: "1.00",
    };
    await prisma.attribution.create({ data });
    await expect(prisma.attribution.create({ data })).rejects.toThrow();
    const otherItem = await prisma.conversionItem.create({
      data: {
        conversionId: conversion.id,
        sku: product.sku,
        qty: 1,
        unitPrice: "10.00",
        lineDiscount: "0.00",
        lineVat: "0.00",
        commissionableNet: "10.00",
      },
    });
    await expect(
      prisma.attribution.create({
        data: { ...data, conversionItemId: otherItem.id },
      }),
    ).rejects.toThrow();
  });

  it("rejects negative attribution amounts", async () => {
    const { brand, creator, product, link } = await seedLink();
    const click = await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        trackingLinkId: link.id,
        brandId: brand.id,
      },
    });
    const { item } = await seedConversionItem();
    await expect(
      prisma.attribution.create({
        data: {
          conversionItemId: item.id,
          clickId: click.id,
          creatorId: creator.id,
          productId: product.id,
          commissionAmount: "-0.01",
        },
      }),
    ).rejects.toThrow();
  });

  it("database-enforces immutable attribution amounts", async () => {
    const { brand, creator, product, link } = await seedLink();
    const click = await prisma.click.create({
      data: {
        id: `ck_${crypto.randomUUID()}`,
        trackingLinkId: link.id,
        brandId: brand.id,
      },
    });
    const { item } = await seedConversionItem();
    const attribution = await prisma.attribution.create({
      data: {
        conversionItemId: item.id,
        clickId: click.id,
        creatorId: creator.id,
        productId: product.id,
        commissionAmount: "1.00",
      },
    });
    await expect(
      prisma.attribution.update({
        where: { id: attribution.id },
        data: { commissionAmount: "2.00" },
      }),
    ).rejects.toThrow(/immutable/);
  });
});
