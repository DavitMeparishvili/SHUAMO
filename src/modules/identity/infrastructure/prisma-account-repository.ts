import { prisma } from "@/src/infrastructure/db/client";
import type {
  AccountRepository,
  BrandRepository,
} from "../ports/account-repository";

export const prismaAccountRepository: AccountRepository = {
  async findByUserId(userId) {
    const record = await prisma.appUser.findUnique({
      where: { id: userId },
      include: { brand: true, creator: true },
    });
    if (record === null) return undefined;
    return {
      userId: record.id,
      isAdmin: record.isAdmin,
      accessDisabled: record.accessDisabled,
      ...(record.brand === null
        ? {}
        : {
            brand: {
              id: record.brand.id,
              name: record.brand.name,
              status: record.brand.status,
            },
          }),
      ...(record.creator === null
        ? {}
        : {
            creator: {
              id: record.creator.id,
              displayName: record.creator.displayName,
              status: record.creator.status,
            },
          }),
    };
  },
};

export const prismaBrandRepository: BrandRepository = {
  async findById(id) {
    return (
      (await prisma.brand.findUnique({
        where: { id },
        select: { id: true },
      })) ?? undefined
    );
  },
  async findByKeyPrefix(keyPrefix) {
    return (
      (await prisma.brand.findUnique({
        where: { keyPrefix },
        select: {
          id: true,
          keyHash: true,
          status: true,
          vatRegistered: true,
        },
      })) ?? undefined
    );
  },
  async updateKey(id, key) {
    await prisma.brand.update({ where: { id }, data: key });
  },
};

export async function brandKeyPrefix(
  brandId: string,
): Promise<string | undefined> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { keyPrefix: true },
  });
  return brand?.keyPrefix;
}

export async function brandIntegrationIdentity(brandId: string) {
  return prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, status: true, vatRegistered: true },
  });
}
