import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type {
  ProductRecord,
  ProductRepository,
} from "../ports/product-repository";

type ProductDatabase = Pick<typeof prisma, "product">;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toRecord(record: {
  id: string;
  brandId: string;
  sku: string;
  title: string;
  description: string;
  priceGel: Prisma.Decimal;
  imageUrls: string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: Prisma.Decimal;
  status: "ACTIVE" | "ARCHIVED";
}): ProductRecord {
  return {
    ...record,
    priceGel: record.priceGel.toString(),
    commissionValue: record.commissionValue.toString(),
  };
}

export function createPrismaProductRepository(
  database: ProductDatabase,
): ProductRepository {
  return {
    async findActiveOffer(productId) {
      if (!UUID.test(productId)) return undefined;
      const offer = await database.product.findFirst({
        where: { id: productId, status: "ACTIVE" },
        select: {
          id: true,
          brandId: true,
          commissionType: true,
          commissionValue: true,
        },
      });
      return offer === null
        ? undefined
        : { ...offer, commissionValue: offer.commissionValue.toFixed(4) };
    },
    async create(input) {
      return toRecord(
        await database.product.create({
          data: {
            ...input,
            priceGel: new Prisma.Decimal(input.priceGel),
            commissionValue: new Prisma.Decimal(input.commissionValue),
          },
        }),
      );
    },
    async update(id, input) {
      return toRecord(
        await database.product.update({
          where: { id },
          data: {
            ...input,
            priceGel: new Prisma.Decimal(input.priceGel),
            commissionValue: new Prisma.Decimal(input.commissionValue),
          },
        }),
      );
    },
    async findBrandSku(brandId, sku) {
      return (
        (await database.product.findUnique({
          where: { brandId_sku: { brandId, sku } },
          select: { id: true },
        })) ?? undefined
      );
    },
    async findOwned(brandId, productId) {
      if (!UUID.test(productId)) return undefined;
      const record = await database.product.findFirst({
        where: { id: productId, brandId },
      });
      return record === null ? undefined : toRecord(record);
    },
    async setStatus(productId, status) {
      await database.product.update({
        where: { id: productId },
        data: { status },
      });
    },
    async listActiveForBrand(brandId) {
      return database.product.findMany({
        where: { brandId, status: "ACTIVE" },
        select: { id: true, status: true },
        orderBy: { createdAt: "asc" },
      });
    },
  };
}

export const prismaProductRepository = createPrismaProductRepository(prisma);

export async function listProductsForBrand(brandId: string) {
  return prisma.product.findMany({
    where: { brandId },
    include: { _count: { select: { links: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getProductForBrand(brandId: string, id: string) {
  return prisma.product.findFirst({ where: { id, brandId } });
}
