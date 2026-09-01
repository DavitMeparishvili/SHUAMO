import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import { updateProductForBrand } from "@/src/infrastructure/phase-3-services";
import { prismaProductRepository } from "./prisma-product-repository";
import { seedBrand } from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";

const product = (brandId: string, sku: string) => ({
  brandId,
  sku,
  title: "Perfume",
  priceGel: new Prisma.Decimal("250.00"),
  backlinkUrl: "https://aromashop.ge/p/perfume",
  commissionType: "PERCENT" as const,
  commissionValue: new Prisma.Decimal("0.1250"),
});

describe("product table", () => {
  it("treats malformed product ids as not found before querying PostgreSQL", async () => {
    await expect(
      prismaProductRepository.findOwned(
        "00000000-0000-4000-8000-000000000001",
        "new",
      ),
    ).resolves.toBeUndefined();
  });

  it("stores exact rates and applies defaults", async () => {
    const brand = await seedBrand();
    const row = await prisma.product.create({ data: product(brand.id, "P-9") });
    expect(row.commissionValue.toString()).toBe("0.125");
    expect(row.priceGel.toString()).toBe("250");
    expect(row.status).toBe("ACTIVE");
    expect(row.imageUrls).toEqual([]);
  });
  it("enforces percent, price, image and brand-scoped SKU constraints", async () => {
    const first = await seedBrand();
    const second = await seedBrand();
    await expect(
      prisma.product.create({
        data: {
          ...product(first.id, "BAD"),
          commissionValue: new Prisma.Decimal("12.5"),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.product.create({
        data: {
          ...product(first.id, "NEG"),
          priceGel: new Prisma.Decimal("-1"),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.product.create({
        data: {
          ...product(first.id, "IMG"),
          imageUrls: Array.from(
            { length: 9 },
            (_, i) => `https://cdn.ge/${i}.jpg`,
          ),
        },
      }),
    ).rejects.toThrow();
    await prisma.product.create({ data: product(first.id, "P-9") });
    await expect(
      prisma.product.create({ data: product(first.id, "P-9") }),
    ).rejects.toThrow();
    await expect(
      prisma.product.create({ data: product(second.id, "P-9") }),
    ).resolves.toBeDefined();
  });
  it("permits a fixed commission above one", async () => {
    const brand = await seedBrand();
    await expect(
      prisma.product.create({
        data: {
          ...product(brand.id, "FIX"),
          commissionType: "FIXED",
          commissionValue: new Prisma.Decimal("5"),
        },
      }),
    ).resolves.toMatchObject({ commissionType: "FIXED" });
  });

  it("rejects forged image FormData without changing stored images", async () => {
    const brand = await seedBrand();
    const row = await prisma.product.create({
      data: product(brand.id, "FORGED-IMAGE"),
    });

    await expect(
      updateProductForBrand(brand.id, row.id, {
        sku: row.sku,
        title: row.title,
        description: row.description,
        priceGel: row.priceGel.toString(),
        backlinkUrl: row.backlinkUrl,
        commissionType: row.commissionType,
        commissionValue: row.commissionValue.toString(),
        imageUrls: ["https://attacker.example/forged.jpg"],
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_images" });
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({ imageUrls: [] });
  });
});
