import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import {
  createProductForBrand,
  decidePartnershipForBrand,
} from "./phase-3-services";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";

describe("Phase 3 product and partnership concurrency", () => {
  it("creates zero links when product creation and approval are concurrent", async () => {
    const [brand, creator] = await Promise.all([seedBrand(), seedCreator()]);
    const partnership = await prisma.partnership.create({
      data: { brandId: brand.id, creatorId: creator.id, status: "PENDING" },
    });
    const [productResult, approvalResult] = await Promise.all([
      createProductForBrand(brand.id, {
        sku: `RACE-${crypto.randomUUID()}`,
        title: "Concurrent product",
        priceGel: "100.00",
        backlinkUrl: "https://example.ge/concurrent",
        commissionType: "PERCENT",
        commissionValue: "0.1",
      }),
      decidePartnershipForBrand(brand.id, partnership.id, "APPROVE"),
    ]);
    expect(productResult.ok).toBe(true);
    expect(approvalResult.ok).toBe(true);
    expect(
      await prisma.trackingLink.count({
        where: { product: { brandId: brand.id }, creatorId: creator.id },
      }),
    ).toBe(0);
  });
});
