import { prisma } from "@/src/infrastructure/db/client";
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
    create: (input) => database.partnership.create({ data: input }),
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

export async function listPartnershipsForBrand(brandId: string) {
  return prisma.partnership.findMany({
    where: { brandId },
    include: { creator: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function listApprovedCreatorsForBrand(brandId: string) {
  const [creators, partnerships] = await Promise.all([
    prisma.creator.findMany({
      where: { status: "APPROVED" },
      select: { id: true, displayName: true },
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
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.partnership.findMany({
      where: { creatorId },
      select: { brandId: true, status: true },
    }),
  ]);
  const byBrand = new Map(partnerships.map((row) => [row.brandId, row.status]));
  return brands.map((brand) => ({ ...brand, status: byBrand.get(brand.id) }));
}
