import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import {
  decidePartnershipForBrand,
  setLinkStatusForBrand,
} from "@/src/infrastructure/phase-3-services";
import { seedBrand, seedCreator } from "@/src/test/fixtures/accounts";

describe("Phase 3 brand link lifecycle", () => {
  it("authorizes a single-link toggle by brand ownership", async () => {
    const [owner, otherBrand, creator] = await Promise.all([
      seedBrand(),
      seedBrand(),
      seedCreator(),
    ]);
    const product = await prisma.product.create({
      data: {
        brandId: owner.id,
        sku: "LINK-OWNER",
        title: "Owned product",
        priceGel: "100.00",
        backlinkUrl: "https://example.ge/product",
        commissionType: "FIXED",
        commissionValue: "10",
      },
    });
    const link = await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: creator.id,
        code: "OWNER001",
        commissionType: product.commissionType,
        commissionValue: product.commissionValue,
      },
    });

    await expect(
      setLinkStatusForBrand(
        { kind: "brand", id: otherBrand.id },
        link.id,
        "DISABLED",
      ),
    ).resolves.toEqual({ ok: false, error: "not_found" });
    expect(
      await prisma.trackingLink.findUniqueOrThrow({ where: { id: link.id } }),
    ).toMatchObject({ status: "ACTIVE" });

    await expect(
      setLinkStatusForBrand(
        { kind: "brand", id: owner.id },
        link.id,
        "DISABLED",
      ),
    ).resolves.toEqual({ ok: true, value: undefined });
    expect(
      await prisma.trackingLink.findUniqueOrThrow({ where: { id: link.id } }),
    ).toMatchObject({ status: "DISABLED" });
  });

  it("removes an approved partnership without deleting its historical links", async () => {
    const [brand, creator] = await Promise.all([seedBrand(), seedCreator()]);
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "REMOVE-CREATOR",
        title: "Historical product",
        priceGel: "100.00",
        backlinkUrl: "https://example.ge/product",
        commissionType: "FIXED",
        commissionValue: "10",
      },
    });
    const partnership = await prisma.partnership.create({
      data: { brandId: brand.id, creatorId: creator.id, status: "APPROVED" },
    });
    const link = await prisma.trackingLink.create({
      data: {
        productId: product.id,
        creatorId: creator.id,
        code: "HISTORY1",
        commissionType: product.commissionType,
        commissionValue: product.commissionValue,
      },
    });

    await expect(
      decidePartnershipForBrand(brand.id, partnership.id, "REJECT"),
    ).resolves.toEqual({ ok: true, value: undefined });
    expect(
      await prisma.partnership.findUniqueOrThrow({
        where: { id: partnership.id },
      }),
    ).toMatchObject({ status: "REJECTED" });
    await expect(
      prisma.trackingLink.findUnique({ where: { id: link.id } }),
    ).resolves.not.toBeNull();
  });
});
