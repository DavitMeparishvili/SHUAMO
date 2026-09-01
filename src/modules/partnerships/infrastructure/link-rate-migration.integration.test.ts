import { prisma } from "@/src/infrastructure/db/client";
import {
  seedApprovedPartnership,
  seedCreator,
} from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";

describe("single-link attribution migration", () => {
  it("ATTR-006 and ATTR-007 store immutable link terms independently of the product", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `RATE-${crypto.randomUUID()}`,
        title: "Rate fixture",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/rate-fixture",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const link = await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: creator.id,
        code: crypto.randomUUID().replaceAll("-", "").slice(0, 8),
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "12.0000" },
    });
    expect(
      (
        await prisma.trackingLink.findUniqueOrThrow({ where: { id: link.id } })
      ).commissionValue.toFixed(4),
    ).toBe("8.0000");
    await expect(
      prisma.trackingLink.update({
        where: { id: link.id },
        data: { commissionValue: "12.0000" },
      }),
    ).rejects.toThrow();
  });

  it("ATTR-001 permits 100 active creators on one product", async () => {
    const { brand } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `MANY-${crypto.randomUUID()}`,
        title: "Shared product",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/shared",
        commissionType: "PERCENT",
        commissionValue: "0.1000",
      },
    });
    const creators = await Promise.all(
      Array.from({ length: 100 }, () => seedCreator()),
    );
    const result = await prisma.trackingLink.createMany({
      data: creators.map((creator, index) => ({
        productId: product.id,
        creatorId: creator.id,
        code: `M${index.toString().padStart(7, "0")}`,
        commissionType: "PERCENT" as const,
        commissionValue: "0.1000",
      })),
    });
    expect(result.count).toBe(100);
    expect(
      await prisma.trackingLink.count({ where: { productId: product.id } }),
    ).toBe(100);
  });

  it("permits historical links but refuses two active links for one pair", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `HISTORY-${crypto.randomUUID()}`,
        title: "History fixture",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/history",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const data = {
      productId: product.id,
      creatorId: creator.id,
      commissionType: "FIXED" as const,
      commissionValue: "8.0000",
    };
    await prisma.trackingLink.create({
      data: { ...data, code: "OLD00001", status: "DISABLED" },
    });
    await prisma.trackingLink.create({
      data: { ...data, code: "NEW00001", status: "ACTIVE" },
    });
    await expect(
      prisma.trackingLink.create({
        data: { ...data, code: "NEW00002", status: "ACTIVE" },
      }),
    ).rejects.toThrow();
  });
});
