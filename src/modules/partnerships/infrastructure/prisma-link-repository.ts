import { prisma } from "@/src/infrastructure/db/client";
import type { LinkRepository } from "../ports/link-repository";

type LinkDatabase = Pick<typeof prisma, "trackingLink">;

export function createPrismaLinkRepository(
  database: LinkDatabase,
): LinkRepository {
  return {
    listForCreator: (creatorId) =>
      database.trackingLink.findMany({
        where: { creatorId },
        select: { productId: true, creatorId: true },
      }),
    listForProducts: (productIds) =>
      database.trackingLink.findMany({
        where: { productId: { in: [...productIds] } },
        select: { productId: true, creatorId: true },
      }),
    async createMany(links) {
      if (links.length === 0) return;
      await database.trackingLink.createMany({ data: [...links] });
    },
    async setStatus(linkId, status) {
      await database.trackingLink.update({
        where: { id: linkId },
        data: { status },
      });
    },
    async findOwned(actor, linkId) {
      return (
        (await database.trackingLink.findFirst({
          where:
            actor.kind === "creator"
              ? { id: linkId, creatorId: actor.id }
              : { id: linkId, product: { brandId: actor.id } },
          select: { id: true },
        })) ?? undefined
      );
    },
  };
}

export const prismaLinkRepository = createPrismaLinkRepository(prisma);

export async function listResolvedLinksForCreator(creatorId: string) {
  return prisma.trackingLink.findMany({
    where: { creatorId },
    include: {
      product: { include: { brand: true } },
      creator: { include: { partnerships: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listResolvedLinksForBrand(brandId: string) {
  return prisma.trackingLink.findMany({
    where: { product: { brandId } },
    include: {
      product: { include: { brand: true } },
      creator: { include: { partnerships: true } },
    },
    orderBy: [
      { product: { title: "asc" } },
      { creator: { displayName: "asc" } },
    ],
  });
}
