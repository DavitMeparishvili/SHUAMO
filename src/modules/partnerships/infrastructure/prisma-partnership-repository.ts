import { prisma } from "@/src/infrastructure/db/client";
import { Prisma } from "@/src/generated/prisma/client";
import type { PartnershipRepository } from "../ports/partnership-repository";

type PartnershipDatabase = Pick<typeof prisma, "partnership">;

export function createPrismaPartnershipRepository(
  database: PartnershipDatabase,
): PartnershipRepository {
  return {
    async find(brandId, creatorId) {
      return (
        (await database.partnership.findUnique({
          where: { brandId_creatorId: { brandId, creatorId } },
        })) ?? undefined
      );
    },
    async findForBrand(brandId, id) {
      return (
        (await database.partnership.findFirst({ where: { id, brandId } })) ??
        undefined
      );
    },
    async create(input) {
      try {
        return await database.partnership.create({ data: input });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await database.partnership.findUnique({
            where: {
              brandId_creatorId: {
                brandId: input.brandId,
                creatorId: input.creatorId,
              },
            },
          });
          if (existing) return existing;
        }
        throw error;
      }
    },
    async setStatus(id, status) {
      await database.partnership.update({ where: { id }, data: { status } });
    },
    async listApprovedCreatorIds(brandId) {
      const rows = await database.partnership.findMany({
        where: { brandId, status: "APPROVED" },
        select: { creatorId: true },
      });
      return rows.map(({ creatorId }) => creatorId);
    },
  };
}

export const prismaPartnershipRepository =
  createPrismaPartnershipRepository(prisma);

export const prismaBrandLookup = {
  async findById(id: string) {
    return (
      (await prisma.brand.findFirst({
        where: { id, status: "APPROVED" },
        select: { id: true },
      })) ?? undefined
    );
  },
};

export const prismaCreatorLookup = {
  async findById(id: string) {
    return (
      (await prisma.creator.findUnique({
        where: { id },
        select: { id: true, status: true },
      })) ?? undefined
    );
  },
};

export async function listPartnershipsForBrand(
  brandId: string,
  filters: { status?: string; activation?: string } = {},
) {
  return prisma.partnership.findMany({
    where: {
      brandId,
      ...(["PENDING", "APPROVED", "REJECTED"].includes(filters.status ?? "")
        ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" }
        : {}),
      ...(filters.activation === "no-link"
        ? { creator: { links: { none: { product: { brandId } } } } }
        : {}),
      ...(filters.activation === "has-link"
        ? { creator: { links: { some: { product: { brandId } } } } }
        : {}),
      ...(filters.activation === "has-sale"
        ? {
            creator: {
              links: {
                some: {
                  product: { brandId },
                  clicks: {
                    some: {
                      attributions: {
                        some: {
                          status: "CANONICAL",
                          conversionItem: {
                            conversion: { status: "CONFIRMED" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
    include: {
      creator: {
        include: { profile: { select: { slug: true, status: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function listApprovedCreatorsForBrand(brandId: string) {
  const [creators, partnerships] = await Promise.all([
    prisma.creator.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        displayName: true,
        profile: { select: { slug: true, status: true } },
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.partnership.findMany({
      where: { brandId },
      select: { creatorId: true },
    }),
  ]);
  const partnered = new Set(partnerships.map(({ creatorId }) => creatorId));
  return creators.filter(({ id }) => !partnered.has(id));
}

export async function listBrandsForCreator(creatorId: string) {
  const [brands, partnerships] = await Promise.all([
    prisma.brand.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        profile: {
          where: { status: "PUBLISHED", slug: { not: null } },
          select: {
            slug: true,
            status: true,
            taglineKa: true,
            taglineEn: true,
            locationKa: true,
            locationEn: true,
            heroImageUrl: true,
            logoUrl: true,
            categories: true,
            collaborationInterests: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.partnership.findMany({
      where: { creatorId },
      select: { brandId: true, status: true, createdAt: true },
    }),
  ]);
  const byBrand = new Map(partnerships.map((row) => [row.brandId, row]));
  return brands.map((brand) => ({
    ...brand,
    status: byBrand.get(brand.id)?.status,
    appliedAt: byBrand.get(brand.id)?.createdAt,
  }));
}
