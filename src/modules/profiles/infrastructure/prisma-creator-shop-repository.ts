import { prisma } from "@/src/infrastructure/db/client";
import type { Prisma } from "@/src/generated/prisma/client";
import { resolveLink } from "@/src/modules/partnerships";
import {
  isPubliclyShown,
  isSameIdSet,
  shopAvailability,
  type CreatorShopEditorItem,
  type PublicShopItem,
  type ShopCandidate,
  type ShopWriteResult,
} from "../domain/creator-shop";

export type {
  CreatorShopEditorItem,
  PublicShopItem,
  ShopCandidate,
  ShopWriteResult,
} from "../domain/creator-shop";

type ShopTransaction = Prisma.TransactionClient;

/**
 * The creator's links that currently pass `resolveLink`: the same shape as the
 * partnerships module's resolved-active filter. Shared by the picker and by
 * `addShopItems`, so what the picker offers is exactly what may be added.
 */
function eligibleLinkWhere(creatorId: string): Prisma.TrackingLinkWhereInput {
  return {
    creatorId,
    status: "ACTIVE",
    product: {
      status: "ACTIVE",
      brand: {
        status: "APPROVED",
        partnerships: { some: { creatorId, status: "APPROVED" } },
      },
    },
  };
}

function shopItemSelect(creatorId: string) {
  return {
    productId: true,
    position: true,
    visible: true,
    product: {
      select: {
        title: true,
        status: true,
        offerStartsAt: true,
        offerEndsAt: true,
        imageUrls: true,
        brand: {
          select: {
            name: true,
            status: true,
            partnerships: {
              where: { creatorId },
              select: { status: true },
              take: 1,
            },
          },
        },
        links: {
          where: { creatorId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { code: true, status: true },
        },
      },
    },
  } as const satisfies Prisma.CreatorShopItemSelect;
}

/**
 * Serialise every shop write for one creator, so concurrent adds, removes and
 * reorders cannot leave duplicate or missing positions.
 */
async function lockCreatorShop(tx: ShopTransaction, creatorId: string) {
  await tx.$queryRaw`SELECT id FROM "creator" WHERE id = ${creatorId}::uuid FOR UPDATE`;
}

export async function listCreatorShopForOwner(
  creatorId: string,
  now: Date = new Date(),
): Promise<CreatorShopEditorItem[]> {
  const rows = await prisma.creatorShopItem.findMany({
    where: { creatorId },
    orderBy: { position: "asc" },
    select: shopItemSelect(creatorId),
  });
  return rows.map(({ productId, position, visible, product }) => {
    const link = product.links[0];
    const linkActive =
      link !== undefined &&
      resolveLink({
        brandStatus: product.brand.status,
        partnershipStatus: product.brand.partnerships[0]?.status,
        productStatus: product.status,
        linkStatus: link.status,
      }).active;
    const availability = shopAvailability(
      {
        linkActive,
        productActive: product.status === "ACTIVE",
        offerStartsAt: product.offerStartsAt,
        offerEndsAt: product.offerEndsAt,
        imageCount: product.imageUrls.length,
      },
      now,
    );
    return {
      productId,
      position,
      visible,
      availability,
      title: product.title,
      brandName: product.brand.name,
      imageUrl: product.imageUrls[0] ?? null,
      code: linkActive ? link.code : null,
    };
  });
}

export async function listPublicCreatorShop(
  creatorId: string,
  now: Date = new Date(),
): Promise<PublicShopItem[]> {
  const items = await listCreatorShopForOwner(creatorId, now);
  return items.flatMap((item) =>
    isPubliclyShown(item.visible, item.availability) &&
    item.code !== null &&
    item.imageUrl !== null
      ? [
          {
            productId: item.productId,
            code: item.code,
            title: item.title,
            brandName: item.brandName,
            imageUrl: item.imageUrl,
          },
        ]
      : [],
  );
}

export async function listShopCandidates(
  creatorId: string,
  now: Date = new Date(),
): Promise<ShopCandidate[]> {
  const links = await prisma.trackingLink.findMany({
    where: {
      AND: [
        eligibleLinkWhere(creatorId),
        { product: { shopItems: { none: { creatorId } } } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      product: {
        select: {
          id: true,
          title: true,
          imageUrls: true,
          offerStartsAt: true,
          offerEndsAt: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
  const seen = new Set<string>();
  return links.flatMap(({ product }) => {
    if (seen.has(product.id)) return [];
    seen.add(product.id);
    return [
      {
        productId: product.id,
        title: product.title,
        brandName: product.brand.name,
        imageUrl: product.imageUrls[0] ?? null,
        availability: shopAvailability(
          {
            linkActive: true,
            productActive: true,
            offerStartsAt: product.offerStartsAt,
            offerEndsAt: product.offerEndsAt,
            imageCount: product.imageUrls.length,
          },
          now,
        ),
      },
    ];
  });
}

export async function listShopProductIds(creatorId: string): Promise<string[]> {
  const rows = await prisma.creatorShopItem.findMany({
    where: { creatorId },
    orderBy: { position: "asc" },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

export async function addShopItems(
  creatorId: string,
  productIds: string[],
): Promise<ShopWriteResult> {
  const requested = [...new Set(productIds)];
  return prisma.$transaction(async (tx): Promise<ShopWriteResult> => {
    await lockCreatorShop(tx, creatorId);
    const existing = await tx.creatorShopItem.findMany({
      where: { creatorId, productId: { in: requested } },
      select: { productId: true },
    });
    const inShop = new Set(existing.map((row) => row.productId));
    const fresh = requested.filter((id) => !inShop.has(id));
    if (fresh.length === 0) return { ok: true };

    const eligible = await tx.trackingLink.findMany({
      where: {
        AND: [eligibleLinkWhere(creatorId), { productId: { in: fresh } }],
      },
      select: { productId: true },
    });
    const eligibleIds = new Set(eligible.map((row) => row.productId));
    if (fresh.some((id) => !eligibleIds.has(id))) {
      return { ok: false, error: "not_eligible" };
    }

    await tx.creatorShopItem.updateMany({
      where: { creatorId },
      data: { position: { increment: fresh.length } },
    });
    await tx.creatorShopItem.createMany({
      data: fresh.map((productId, position) => ({
        creatorId,
        productId,
        position,
      })),
    });
    return { ok: true };
  });
}

export async function removeShopItem(
  creatorId: string,
  productId: string,
): Promise<ShopWriteResult> {
  return prisma.$transaction(async (tx): Promise<ShopWriteResult> => {
    await lockCreatorShop(tx, creatorId);
    const item = await tx.creatorShopItem.findUnique({
      where: { creatorId_productId: { creatorId, productId } },
      select: { id: true, position: true },
    });
    if (item === null) return { ok: false, error: "not_found" };
    await tx.creatorShopItem.delete({ where: { id: item.id } });
    await tx.creatorShopItem.updateMany({
      where: { creatorId, position: { gt: item.position } },
      data: { position: { decrement: 1 } },
    });
    return { ok: true };
  });
}

export async function setShopItemVisible(
  creatorId: string,
  productId: string,
  visible: boolean,
): Promise<ShopWriteResult> {
  const { count } = await prisma.creatorShopItem.updateMany({
    where: { creatorId, productId },
    data: { visible },
  });
  return count === 0 ? { ok: false, error: "not_found" } : { ok: true };
}

export async function reorderShopItems(
  creatorId: string,
  orderedProductIds: string[],
): Promise<ShopWriteResult> {
  return prisma.$transaction(async (tx): Promise<ShopWriteResult> => {
    await lockCreatorShop(tx, creatorId);
    const current = await tx.creatorShopItem.findMany({
      where: { creatorId },
      select: { productId: true, position: true },
    });
    if (
      !isSameIdSet(
        current.map((row) => row.productId),
        orderedProductIds,
      )
    ) {
      return { ok: false, error: "invalid_order" };
    }
    const positions = new Map(
      current.map((row) => [row.productId, row.position]),
    );
    for (const [position, productId] of orderedProductIds.entries()) {
      if (positions.get(productId) === position) continue;
      await tx.creatorShopItem.update({
        where: { creatorId_productId: { creatorId, productId } },
        data: { position },
      });
    }
    return { ok: true };
  });
}
