import { prisma } from "@/src/infrastructure/db/client";
import { createProductLinkForCreator } from "@/src/infrastructure/phase-3-services";
import { seedApprovedPartnership } from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";

describe("creator product link creation", () => {
  it("ATTR-002 creates one active exact-product link under concurrency", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `CREATE-${crypto.randomUUID()}`,
        title: "Creator offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/offer",
        commissionType: "PERCENT",
        commissionValue: "0.1250",
      },
    });
    const results = await Promise.all([
      createProductLinkForCreator(creator.id, product.id),
      createProductLinkForCreator(creator.id, product.id),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: "active_link_exists" },
    ]);
    expect(
      await prisma.trackingLink.count({
        where: {
          productId: product.id,
          creatorId: creator.id,
          status: "ACTIVE",
        },
      }),
    ).toBe(1);
  });

  it("ATTR-006 and ATTR-007 preserve history while new links accept new terms", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `TERMS-${crypto.randomUUID()}`,
        title: "Changing offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/terms",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const oldResult = await createProductLinkForCreator(creator.id, product.id);
    expect(oldResult.ok).toBe(true);
    if (!oldResult.ok) return;
    await prisma.trackingLink.update({
      where: { id: oldResult.value.linkId },
      data: { status: "DISABLED" },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "12.0000" },
    });
    const newResult = await createProductLinkForCreator(creator.id, product.id);
    expect(newResult).toMatchObject({
      ok: true,
      value: { commissionValue: "12.0000" },
    });
    const history = await prisma.trackingLink.findMany({
      where: { productId: product.id, creatorId: creator.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((link) => link.commissionValue.toFixed(4))).toEqual([
      "8.0000",
      "12.0000",
    ]);
  });
});
