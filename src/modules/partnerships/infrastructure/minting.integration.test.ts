import { Prisma } from "@/src/generated/prisma/client";
import { createProductForBrand } from "@/src/infrastructure/phase-3-services";
import { prisma } from "@/src/infrastructure/db/client";
import {
  seedApprovedPartnership,
  seedBrand,
  seedCreator,
} from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";

describe("link minting invariant", () => {
  it("does not mint for a partnership that was never approved", async () => {
    const [brand, creator] = await Promise.all([seedBrand(), seedCreator()]);
    await prisma.partnership.create({
      data: { brandId: brand.id, creatorId: creator.id },
    });
    await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "P-1",
        title: "Product",
        priceGel: new Prisma.Decimal("1"),
        backlinkUrl: "https://example.ge",
        commissionType: "FIXED",
        commissionValue: new Prisma.Decimal("1"),
      },
    });
    expect(
      await prisma.trackingLink.count({ where: { creatorId: creator.id } }),
    ).toBe(0);
  });
  it("mints when a product is added after approval", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const result = await createProductForBrand(brand.id, {
      sku: "P-LATER",
      title: "Later",
      priceGel: "10.00",
      backlinkUrl: "https://example.ge",
      commissionType: "FIXED",
      commissionValue: "1",
    });
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(
      await prisma.trackingLink.findFirst({
        where: { creatorId: creator.id, product: { sku: "P-LATER" } },
      }),
    ).toMatchObject({ status: "ACTIVE" });
  });
  it("refuses two links for one product and creator", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "P-1",
        title: "Product",
        priceGel: new Prisma.Decimal("1"),
        backlinkUrl: "https://example.ge",
        commissionType: "FIXED",
        commissionValue: new Prisma.Decimal("1"),
      },
    });
    await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: creator.id,
        code: "K7M2QPXZ",
        commissionType: product.commissionType,
        commissionValue: product.commissionValue,
      },
    });
    await expect(
      prisma.trackingLink.create({
        data: {
          productId: product.id,
          creatorId: creator.id,
          code: "ABCDEFGH",
          commissionType: product.commissionType,
          commissionValue: product.commissionValue,
        },
      }),
    ).rejects.toThrow();
  });
});
