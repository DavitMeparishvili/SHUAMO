import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import {
  ProductLinkCreateError,
  type LinkRepository,
} from "../ports/link-repository";

type LinkDatabase = Pick<typeof prisma, "$transaction" | "trackingLink">;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LockedProductOffer {
  productStatus: "ACTIVE" | "ARCHIVED";
  brandStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

interface LockedAccount {
  status: "PENDING" | "APPROVED" | "SUSPENDED";
}

interface LockedPartnership {
  status: "PENDING" | "APPROVED" | "REJECTED";
}

function isActivePairConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta).includes(
      "tracking_link_one_active_product_creator",
    )
  );
}

export function createPrismaLinkRepository(
  database: LinkDatabase,
): LinkRepository {
  return {
    async createAccepted(input) {
      if (!UUID.test(input.productId)) {
        throw new ProductLinkCreateError("product_not_found");
      }
      if (!UUID.test(input.creatorId)) {
        throw new ProductLinkCreateError("creator_not_approved");
      }

      try {
        return await database.$transaction(async (transaction) => {
          const [offer] = await transaction.$queryRaw<LockedProductOffer[]>(
            Prisma.sql`
              SELECT
                p.status::text AS "productStatus",
                b.status::text AS "brandStatus",
                p.commission_type::text AS "commissionType",
                p.commission_value::text AS "commissionValue"
              FROM product AS p
              JOIN brand AS b ON b.id = p.brand_id
              WHERE p.id = CAST(${input.productId} AS uuid)
              FOR UPDATE OF p, b
            `,
          );
          if (offer === undefined || offer.productStatus !== "ACTIVE") {
            throw new ProductLinkCreateError("product_not_found");
          }
          if (offer.brandStatus !== "APPROVED") {
            throw new ProductLinkCreateError("brand_not_approved");
          }

          const [creator] = await transaction.$queryRaw<LockedAccount[]>(
            Prisma.sql`
              SELECT status::text AS status
              FROM creator
              WHERE id = CAST(${input.creatorId} AS uuid)
              FOR UPDATE
            `,
          );
          if (creator?.status !== "APPROVED") {
            throw new ProductLinkCreateError("creator_not_approved");
          }

          const [partnership] = await transaction.$queryRaw<
            LockedPartnership[]
          >(Prisma.sql`
              SELECT status::text AS status
              FROM partnership
              WHERE brand_id = (
                SELECT brand_id FROM product
                WHERE id = CAST(${input.productId} AS uuid)
              )
                AND creator_id = CAST(${input.creatorId} AS uuid)
              FOR UPDATE
            `);
          if (partnership?.status !== "APPROVED") {
            throw new ProductLinkCreateError("partnership_not_approved");
          }

          if (
            offer.commissionType !== input.acceptedCommissionType ||
            offer.commissionValue !== input.acceptedCommissionValue
          ) {
            throw new ProductLinkCreateError("offer_changed");
          }

          const link = await transaction.trackingLink.create({
            data: {
              productId: input.productId,
              creatorId: input.creatorId,
              code: input.code,
              commissionType: offer.commissionType,
              commissionValue: new Prisma.Decimal(offer.commissionValue),
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
        });
      } catch (error) {
        if (isActivePairConflict(error)) {
          throw new ProductLinkCreateError("active_link_exists");
        }
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

export async function listLinkOffersForCreator(creatorId: string) {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      brand: {
        status: "APPROVED",
        partnerships: {
          some: {
            creatorId,
            status: "APPROVED",
            creator: { status: "APPROVED" },
          },
        },
      },
      links: {
        none: { creatorId, status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      title: true,
      commissionType: true,
      commissionValue: true,
      brand: { select: { name: true } },
    },
    orderBy: [{ brand: { name: "asc" } }, { title: "asc" }],
  });
  return products.map((product) => ({
    productId: product.id,
    title: product.title,
    brandName: product.brand.name,
    commissionType: product.commissionType,
    commissionValue: product.commissionValue.toFixed(4),
  }));
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
