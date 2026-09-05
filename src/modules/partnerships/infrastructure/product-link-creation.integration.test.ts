import { prisma } from "@/src/infrastructure/db/client";
import { createProductLinkForCreator } from "@/src/infrastructure/phase-3-services";
import { seedApprovedPartnership } from "@/src/test/fixtures/accounts";
import { describe, expect, it } from "vitest";
import {
  getPublicProductOffer,
  listResolvedLinksForBrandProduct,
} from "./prisma-link-repository";
import { parseAcceptedOfferTerms } from "../application/accepted-offer-terms";

function acceptance(product: {
  id: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: { toFixed(decimalPlaces: number): string };
  termsVersion: number;
}) {
  return {
    productId: product.id,
    commissionType: product.commissionType,
    commissionValue: product.commissionValue.toFixed(4),
    termsVersion: product.termsVersion,
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function expectBlocked<T>(operation: Promise<T>) {
  const state = await Promise.race([
    operation.then(
      () => "settled" as const,
      () => "settled" as const,
    ),
    new Promise<"blocked">((resolve) => {
      setTimeout(() => resolve("blocked"), 100);
    }),
  ]);
  expect(state).toBe("blocked");
}

describe("creator product link creation", () => {
  it("product details preserve the viewer's accepted terms after the brand changes its offer", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: "DETAIL-SNAPSHOT",
        title: "Saved offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/saved",
        commissionType: "FIXED",
        commissionValue: "8.0000",
        cookieWindowDays: 45,
        couponPolicy: "Original coupon policy",
      },
    });
    expect(
      (await createProductLinkForCreator(creator.id, acceptance(product))).ok,
    ).toBe(true);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        commissionValue: "20.0000",
        cookieWindowDays: 7,
        couponPolicy: "Replacement coupon policy",
        termsVersion: 2,
      },
    });
    const offer = await getPublicProductOffer(product.id, creator.id);
    expect(offer).toMatchObject({
      commissionValue: "20.0000",
      termsVersion: 2,
    });
    expect(offer?.links[0]).toMatchObject({
      commissionType: "FIXED",
      commissionValue: "8.0000",
    });
    expect(
      parseAcceptedOfferTerms(offer?.links[0]?.acceptedTerms),
    ).toMatchObject({
      version: 1,
      cookieWindowDays: 45,
      couponPolicy: "Original coupon policy",
    });
    expect((await getPublicProductOffer(product.id))?.links).toEqual([]);
    const other = await seedApprovedPartnership();
    expect(
      (await getPublicProductOffer(product.id, other.creator.id))?.links,
    ).toEqual([]);
    await prisma.partnership.updateMany({
      where: { brandId: brand.id, creatorId: creator.id },
      data: { status: "REJECTED" },
    });
    expect(await getPublicProductOffer(product.id, creator.id)).toMatchObject({
      links: [],
      isCreatorEligible: false,
    });
  });

  it("scopes a brand product drill-down to that product's creator links", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const products = await Promise.all(
      ["FIRST", "OTHER"].map((suffix) =>
        prisma.product.create({
          data: {
            brandId: brand.id,
            sku: `DRILL-${suffix}-${crypto.randomUUID()}`,
            title: `${suffix} drill-down product`,
            priceGel: "100.00",
            backlinkUrl: `https://shop.example.ge/${suffix.toLowerCase()}`,
            commissionType: "PERCENT",
            commissionValue: "0.1250",
          },
        }),
      ),
    );
    for (const product of products) {
      expect(
        await createProductLinkForCreator(creator.id, acceptance(product)),
      ).toMatchObject({ ok: true });
    }

    const links = await listResolvedLinksForBrandProduct(
      brand.id,
      products[0]!.id,
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      productId: products[0]!.id,
      creator: { displayName: creator.displayName },
    });
  });

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
    const accepted = acceptance(product);
    const results = await Promise.all([
      createProductLinkForCreator(creator.id, accepted),
      createProductLinkForCreator(creator.id, accepted),
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
        cookieWindowDays: 45,
        payoutTiming: "MONTHLY",
        allowedChannels: ["INSTAGRAM", "YOUTUBE"],
        availableRegions: ["GE", "AM"],
        couponPolicy: "Only brand-issued coupon codes are permitted.",
      },
    });
    const oldResult = await createProductLinkForCreator(
      creator.id,
      acceptance(product),
    );
    expect(oldResult.ok).toBe(true);
    if (!oldResult.ok) return;
    expect(
      await prisma.trackingLink.findUniqueOrThrow({
        where: { id: oldResult.value.linkId },
        select: { acceptedTerms: true, termsAcceptedAt: true },
      }),
    ).toMatchObject({
      acceptedTerms: {
        version: product.termsVersion,
        commissionType: "FIXED",
        commissionValue: "8.0000",
        cookieWindowDays: 45,
        payoutTiming: "MONTHLY",
        allowedChannels: ["INSTAGRAM", "YOUTUBE"],
        availableRegions: ["GE", "AM"],
        couponPolicy: "Only brand-issued coupon codes are permitted.",
      },
      termsAcceptedAt: expect.any(Date),
    });
    await prisma.trackingLink.update({
      where: { id: oldResult.value.linkId },
      data: { status: "DISABLED" },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "12.0000" },
    });
    const refreshed = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    const newResult = await createProductLinkForCreator(
      creator.id,
      acceptance(refreshed),
    );
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

  it.each([
    ["brand", "brand_not_approved"],
    ["creator", "creator_not_approved"],
  ] as const)(
    "refuses creation when the approved %s account becomes suspended",
    async (account, error) => {
      const { brand, creator } = await seedApprovedPartnership();
      const product = await prisma.product.create({
        data: {
          brandId: brand.id,
          sku: `SUSPEND-${crypto.randomUUID()}`,
          title: "Suspended account offer",
          priceGel: "100.00",
          backlinkUrl: "https://shop.example.ge/suspended",
          commissionType: "FIXED",
          commissionValue: "8.0000",
        },
      });
      if (account === "brand") {
        await prisma.brand.update({
          where: { id: brand.id },
          data: { status: "SUSPENDED" },
        });
      } else {
        await prisma.creator.update({
          where: { id: creator.id },
          data: { status: "SUSPENDED" },
        });
      }

      expect(
        await createProductLinkForCreator(creator.id, acceptance(product)),
      ).toEqual({ ok: false, error });
      expect(
        await prisma.trackingLink.count({ where: { productId: product.id } }),
      ).toBe(0);
    },
  );

  it("rejects stale displayed terms instead of silently accepting a changed offer", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `STALE-${crypto.randomUUID()}`,
        title: "Stale offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/stale",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const displayed = acceptance(product);
    await prisma.product.update({
      where: { id: product.id },
      data: { commissionValue: "12.0000" },
    });

    expect(await createProductLinkForCreator(creator.id, displayed)).toEqual({
      ok: false,
      error: "offer_changed",
    });
    expect(
      await prisma.trackingLink.count({ where: { productId: product.id } }),
    ).toBe(0);
  });

  it("serializes a rate update ahead of a racing stale acceptance", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `RACE-RATE-${crypto.randomUUID()}`,
        title: "Racing rate offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/racing-rate",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    });
    const displayed = acceptance(product);
    const changed = deferred();
    const release = deferred();
    const rateUpdate = prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: product.id },
        data: { commissionValue: "12.0000" },
      });
      changed.resolve();
      await release.promise;
    });
    await changed.promise;

    const creation = createProductLinkForCreator(creator.id, displayed);
    try {
      await expectBlocked(creation);
    } finally {
      release.resolve();
    }
    await rateUpdate;

    expect(await creation).toEqual({ ok: false, error: "offer_changed" });
    expect(
      await prisma.trackingLink.count({ where: { productId: product.id } }),
    ).toBe(0);
  });

  it.each([
    ["brand", "brand_not_approved"],
    ["creator", "creator_not_approved"],
  ] as const)(
    "serializes %s suspension ahead of a racing link creation",
    async (account, error) => {
      const { brand, creator } = await seedApprovedPartnership();
      const product = await prisma.product.create({
        data: {
          brandId: brand.id,
          sku: `RACE-ACCOUNT-${crypto.randomUUID()}`,
          title: "Racing account offer",
          priceGel: "100.00",
          backlinkUrl: "https://shop.example.ge/racing-account",
          commissionType: "PERCENT",
          commissionValue: "0.1250",
        },
      });
      const changed = deferred();
      const release = deferred();
      const suspension = prisma.$transaction(async (transaction) => {
        if (account === "brand") {
          await transaction.brand.update({
            where: { id: brand.id },
            data: { status: "SUSPENDED" },
          });
        } else {
          await transaction.creator.update({
            where: { id: creator.id },
            data: { status: "SUSPENDED" },
          });
        }
        changed.resolve();
        await release.promise;
      });
      await changed.promise;

      const creation = createProductLinkForCreator(
        creator.id,
        acceptance(product),
      );
      try {
        await expectBlocked(creation);
      } finally {
        release.resolve();
      }
      await suspension;

      expect(await creation).toEqual({ ok: false, error });
      expect(
        await prisma.trackingLink.count({ where: { productId: product.id } }),
      ).toBe(0);
    },
  );

  it("serializes partnership revocation ahead of a racing link creation", async () => {
    const { brand, creator, partnership } = await seedApprovedPartnership();
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        sku: `REVOKE-${crypto.randomUUID()}`,
        title: "Revoked offer",
        priceGel: "100.00",
        backlinkUrl: "https://shop.example.ge/revoked",
        commissionType: "PERCENT",
        commissionValue: "0.1250",
      },
    });
    const changed = deferred();
    const release = deferred();
    const revocation = prisma.$transaction(async (transaction) => {
      await transaction.partnership.update({
        where: { id: partnership.id },
        data: { status: "REJECTED" },
      });
      changed.resolve();
      await release.promise;
    });
    await changed.promise;

    const creation = createProductLinkForCreator(
      creator.id,
      acceptance(product),
    );
    try {
      await expectBlocked(creation);
    } finally {
      release.resolve();
    }
    await revocation;

    expect(await creation).toEqual({
      ok: false,
      error: "partnership_not_approved",
    });
    expect(
      await prisma.trackingLink.count({ where: { productId: product.id } }),
    ).toBe(0);
  });
});
