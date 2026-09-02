import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type {
  ProductRecord,
  ProductRepository,
} from "../ports/product-repository";
import type { ProductTypeValue } from "../domain/product-taxonomy";

type ProductDatabase = Pick<typeof prisma, "product">;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toRecord(record: {
  id: string;
  brandId: string;
  sku: string;
  title: string;
  description: string;
  productType: ProductTypeValue;
  priceGel: Prisma.Decimal;
  imageUrls: string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: Prisma.Decimal;
  cookieWindowDays: number;
  payoutTiming: "AFTER_CONFIRMED_CONVERSION" | "MONTHLY" | "CUSTOM";
  allowedChannels: string[];
  prohibitedPromotionMethods: string[];
  availableRegions: string[];
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: Date | null;
  offerEndsAt: Date | null;
  termsVersion: number;
  termsUpdatedAt: Date;
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
    async update(id, input, options) {
      return toRecord(
        await database.product.update({
          where: { id },
          data: {
            ...input,
            priceGel: new Prisma.Decimal(input.priceGel),
            commissionValue: new Prisma.Decimal(input.commissionValue),
            ...(options?.termsChanged
              ? { termsVersion: { increment: 1 }, termsUpdatedAt: new Date() }
              : {}),
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

export interface ProductCatalogQuery {
  q?: string;
  productType?: ProductTypeValue;
  status?: "ACTIVE" | "ARCHIVED";
  sort?: "newest" | "title" | "price_high" | "commission_high";
  page?: number;
  pageSize?: number;
}

export async function listProductsForBrand(
  brandId: string,
  query: ProductCatalogQuery = {},
) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 48);
  const requestedPage = Math.max(query.page ?? 1, 1);
  const where: Prisma.ProductWhereInput = {
    brandId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.productType ? { productType: query.productType } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { sku: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "title"
      ? [{ title: "asc" }]
      : query.sort === "price_high"
        ? [{ priceGel: "desc" }, { title: "asc" }]
        : query.sort === "commission_high"
          ? [{ commissionValue: "desc" }, { title: "asc" }]
          : [{ status: "asc" }, { createdAt: "desc" }];
  const items = await prisma.product.findMany({
    where,
    include: { _count: { select: { links: true } } },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { items, total, page, pageSize, pageCount };
}

export async function getProductForBrand(brandId: string, id: string) {
  return prisma.product.findFirst({ where: { id, brandId } });
}
