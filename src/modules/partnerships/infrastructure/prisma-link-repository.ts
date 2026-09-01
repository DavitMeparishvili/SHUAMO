import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import {
  ActiveLinkExistsError,
  type LinkRepository,
} from "../ports/link-repository";

type LinkDatabase = Pick<typeof prisma, "trackingLink">;

export function createPrismaLinkRepository(
  database: LinkDatabase,
): LinkRepository {
  return {
    async findActive(productId, creatorId) {
      return (
        (await database.trackingLink.findFirst({
          where: { productId, creatorId, status: "ACTIVE" },
          select: { id: true },
        })) ?? undefined
      );
    },
    async create(input) {
      try {
        const link = await database.trackingLink.create({
          data: {
            ...input,
            commissionValue: new Prisma.Decimal(input.commissionValue),
          },
          select: {
            id: true,
            code: true,
            commissionType: true,
            commissionValue: true,
          },
        });
        return {
          ...link,
          commissionValue: link.commissionValue.toFixed(4),
        };
      } catch (error) {
        const isActivePairConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          JSON.stringify(error.meta).includes(
            "tracking_link_one_active_product_creator",
          );
        if (isActivePairConflict) throw new ActiveLinkExistsError();
        throw error;
      }
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
