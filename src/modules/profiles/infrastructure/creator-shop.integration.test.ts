import { describe, expect, it } from "vitest";
import { prisma } from "@/src/infrastructure/db/client";
import {
  seedApprovedPartnership,
  seedLink,
} from "@/src/test/fixtures/accounts";
import {
  addShopItems,
  listCreatorShopForOwner,
  listPublicCreatorShop,
  listShopCandidates,
  listShopProductIds,
  removeShopItem,
  reorderShopItems,
  setShopItemVisible,
} from "./prisma-creator-shop-repository";

async function seedProduct(
  brandId: string,
  creatorId: string,
  options: {
    title?: string;
    code?: string;
    linkStatus?: "ACTIVE" | "DISABLED";
    imageUrls?: string[];
    createdAt?: Date;
  } = {},
) {
  const suffix = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
  const product = await prisma.product.create({
    data: {
      brandId,
      sku: `SHOP-${suffix}`,
      title: options.title ?? `Product ${suffix}`,
      priceGel: "50.00",
      imageUrls: options.imageUrls ?? ["/images/creator.webp"],
      backlinkUrl: "https://shop.example.ge/item",
      commissionType: "FIXED",
      commissionValue: "5.0000",
    },
  });
  const link = await prisma.trackingLink.create({
    data: {
      productId: product.id,
      creatorId,
      code: options.code ?? suffix,
      commissionType: "FIXED",
      commissionValue: "5.0000",
      status: options.linkStatus ?? "ACTIVE",
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    },
  });
  return { product, link };
}

async function seedShop(count: number) {
  const { brand, creator } = await seedApprovedPartnership();
  const products: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const { product } = await seedProduct(brand.id, creator.id, {
      title: `Item ${index + 1}`,
    });
    products.push(product.id);
  }
  return { brand, creator, products };
}

async function ownerIds(creatorId: string) {
  return (await listCreatorShopForOwner(creatorId)).map(
    (item) => item.productId,
  );
}

describe("creator shop persistence", () => {
  it("adds new items at the top in the given order", async () => {
    const {
      creator,
      products: [p1, p2, p3],
    } = await seedShop(3);
    await expect(addShopItems(creator.id, [p1!])).resolves.toEqual({
      ok: true,
    });
    await expect(addShopItems(creator.id, [p2!, p3!])).resolves.toEqual({
      ok: true,
    });
    const items = await listCreatorShopForOwner(creator.id);
    expect(items.map((item) => item.productId)).toEqual([p2, p3, p1]);
    expect(items.map((item) => item.position)).toEqual([0, 1, 2]);
    expect(items.every((item) => item.visible)).toBe(true);
    expect(items[0]).toMatchObject({
      title: "Item 2",
      brandName: "Test brand",
      imageUrl: "/images/creator.webp",
      availability: "available",
    });
  });

  it("ignores products already in the shop", async () => {
    const {
      creator,
      products: [p1],
    } = await seedShop(1);
    await addShopItems(creator.id, [p1!]);
    await expect(addShopItems(creator.id, [p1!])).resolves.toEqual({
      ok: true,
    });
    await expect(listCreatorShopForOwner(creator.id)).resolves.toHaveLength(1);
  });

  it("rejects a product the creator has no active link for", async () => {
    const {
      brand,
      creator,
      products: [p1],
    } = await seedShop(1);
    const other = await seedLink();
    await expect(
      addShopItems(creator.id, [p1!, other.product.id]),
    ).resolves.toEqual({ ok: false, error: "not_eligible" });
    const disabled = await seedProduct(brand.id, creator.id, {
      linkStatus: "DISABLED",
    });
    await expect(
      addShopItems(creator.id, [disabled.product.id]),
    ).resolves.toEqual({ ok: false, error: "not_eligible" });
    await expect(listShopProductIds(creator.id)).resolves.toEqual([]);
  });

  it("reorders and rejects stale orders", async () => {
    const {
      creator,
      products: [p1, p2, p3],
    } = await seedShop(3);
    await addShopItems(creator.id, [p1!, p2!, p3!]);
    await expect(
      reorderShopItems(creator.id, [p3!, p1!, p2!]),
    ).resolves.toEqual({ ok: true });
    const items = await listCreatorShopForOwner(creator.id);
    expect(items.map((item) => item.productId)).toEqual([p3, p1, p2]);
    expect(items.map((item) => item.position)).toEqual([0, 1, 2]);
    await expect(reorderShopItems(creator.id, [p3!, p1!])).resolves.toEqual({
      ok: false,
      error: "invalid_order",
    });
    await expect(
      reorderShopItems(creator.id, [p3!, p1!, p2!, crypto.randomUUID()]),
    ).resolves.toEqual({ ok: false, error: "invalid_order" });
    await expect(ownerIds(creator.id)).resolves.toEqual([p3, p1, p2]);
  });

  it("keeps positions contiguous across 40 items after a remove", async () => {
    const { creator, products } = await seedShop(40);
    await addShopItems(creator.id, products);
    await expect(removeShopItem(creator.id, products[9]!)).resolves.toEqual({
      ok: true,
    });
    const items = await listCreatorShopForOwner(creator.id);
    expect(items.map((item) => item.position)).toEqual(
      Array.from({ length: 39 }, (_, index) => index),
    );
    expect(items.map((item) => item.productId)).toEqual(
      products.filter((_, index) => index !== 9),
    );
    await expect(removeShopItem(creator.id, products[9]!)).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("public list excludes hidden, archived, ended, not-started and photo-less items", async () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const {
      creator,
      products: [ok, hidden, archived, ended, future, noPhoto],
    } = await seedShop(6);
    await addShopItems(creator.id, [
      ok!,
      hidden!,
      archived!,
      ended!,
      future!,
      noPhoto!,
    ]);
    await expect(
      setShopItemVisible(creator.id, hidden!, false),
    ).resolves.toEqual({ ok: true });
    await prisma.product.update({
      where: { id: archived! },
      data: { status: "ARCHIVED" },
    });
    await prisma.product.update({
      where: { id: ended! },
      data: { offerEndsAt: new Date("2026-11-01T00:00:00Z") },
    });
    await prisma.product.update({
      where: { id: future! },
      data: { offerStartsAt: new Date("2026-12-01T00:00:00Z") },
    });
    await prisma.product.update({
      where: { id: noPhoto! },
      data: { imageUrls: [] },
    });

    const publicItems = await listPublicCreatorShop(creator.id, now);
    expect(publicItems).toHaveLength(1);
    expect(publicItems[0]).toMatchObject({
      productId: ok,
      title: "Item 1",
      brandName: "Test brand",
      imageUrl: "/images/creator.webp",
    });
    expect(publicItems[0]!.code).toMatch(/^[A-Z0-9]+$/);

    const owner = await listCreatorShopForOwner(creator.id, now);
    expect(
      owner.map(({ productId, visible, availability }) => ({
        productId,
        visible,
        availability,
      })),
    ).toEqual([
      { productId: ok, visible: true, availability: "available" },
      { productId: hidden, visible: false, availability: "available" },
      { productId: archived, visible: true, availability: "unavailable" },
      { productId: ended, visible: true, availability: "ended" },
      { productId: future, visible: true, availability: "not-started" },
      { productId: noPhoto, visible: true, availability: "no-photo" },
    ]);
    expect(owner[5]!.imageUrl).toBeNull();
    await expect(
      setShopItemVisible(creator.id, crypto.randomUUID(), false),
    ).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("archived product reappears when restored", async () => {
    const {
      creator,
      products: [p1, p2],
    } = await seedShop(2);
    await addShopItems(creator.id, [p1!, p2!]);
    await prisma.product.update({
      where: { id: p2! },
      data: { status: "ARCHIVED" },
    });
    expect(
      (await listPublicCreatorShop(creator.id)).map((item) => item.productId),
    ).toEqual([p1]);
    await prisma.product.update({
      where: { id: p2! },
      data: { status: "ACTIVE" },
    });
    expect(
      (await listPublicCreatorShop(creator.id)).map((item) => item.productId),
    ).toEqual([p1, p2]);
    const owner = await listCreatorShopForOwner(creator.id);
    expect(owner[1]).toMatchObject({ productId: p2, position: 1 });
  });

  it("follows the creator's new active link after the old one is disabled", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const first = await seedProduct(brand.id, creator.id, { code: "AAA" });
    const second = await seedProduct(brand.id, creator.id);
    await addShopItems(creator.id, [first.product.id, second.product.id]);
    await prisma.trackingLink.update({
      where: { id: first.link.id },
      data: { status: "DISABLED" },
    });
    expect(
      (await listPublicCreatorShop(creator.id)).map((item) => item.productId),
    ).toEqual([second.product.id]);
    const owner = await listCreatorShopForOwner(creator.id);
    expect(owner[0]).toMatchObject({
      productId: first.product.id,
      availability: "unavailable",
      code: null,
    });
    await prisma.trackingLink.create({
      data: {
        productId: first.product.id,
        creatorId: creator.id,
        code: "BBB",
        commissionType: "FIXED",
        commissionValue: "5.0000",
      },
    });
    const publicItems = await listPublicCreatorShop(creator.id);
    expect(publicItems[0]).toMatchObject({
      productId: first.product.id,
      code: "BBB",
    });
    expect(publicItems).toHaveLength(2);
  });

  it("marks items unavailable when the partnership is no longer approved", async () => {
    const {
      creator,
      brand,
      products: [p1],
    } = await seedShop(1);
    await addShopItems(creator.id, [p1!]);
    await prisma.partnership.updateMany({
      where: { creatorId: creator.id, brandId: brand.id },
      data: { status: "REJECTED" },
    });
    await expect(listPublicCreatorShop(creator.id)).resolves.toEqual([]);
    expect((await listCreatorShopForOwner(creator.id))[0]).toMatchObject({
      availability: "unavailable",
    });
  });

  it("candidates exclude items already in the shop and ineligible links", async () => {
    const { brand, creator } = await seedApprovedPartnership();
    const older = await seedProduct(brand.id, creator.id, {
      title: "Older",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newer = await seedProduct(brand.id, creator.id, {
      title: "Newer",
      imageUrls: [],
      createdAt: new Date("2026-06-01T00:00:00Z"),
    });
    const inShop = await seedProduct(brand.id, creator.id, {
      title: "In shop",
    });
    await seedProduct(brand.id, creator.id, {
      title: "Disabled",
      linkStatus: "DISABLED",
    });
    const archived = await seedProduct(brand.id, creator.id, {
      title: "Archived",
    });
    await prisma.product.update({
      where: { id: archived.product.id },
      data: { status: "ARCHIVED" },
    });
    await seedLink();
    await addShopItems(creator.id, [inShop.product.id]);

    await expect(listShopCandidates(creator.id)).resolves.toEqual([
      {
        productId: newer.product.id,
        title: "Newer",
        brandName: "Test brand",
        imageUrl: null,
        availability: "no-photo",
      },
      {
        productId: older.product.id,
        title: "Older",
        brandName: "Test brand",
        imageUrl: "/images/creator.webp",
        availability: "available",
      },
    ]);
    await expect(listShopProductIds(creator.id)).resolves.toEqual([
      inShop.product.id,
    ]);
  });
});
