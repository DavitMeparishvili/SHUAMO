import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import {
  ProductLinkCreateError,
  type LinkRepository,
} from "../ports/link-repository";
import type { ProductTypeValue } from "@/src/modules/catalog";

type LinkDatabase = Pick<typeof prisma, "$transaction" | "trackingLink">;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LockedProductOffer {
  productStatus: "ACTIVE" | "ARCHIVED";
  brandStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  productType: string;
  cookieWindowDays: number;
  payoutTiming: string;
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
                p.commission_value::text AS "commissionValue",
                p.product_type::text AS "productType",
                p.cookie_window_days AS "cookieWindowDays",
                p.payout_timing::text AS "payoutTiming",
                p.allowed_channels AS "allowedChannels",
                p.prohibited_promotion_methods AS "prohibitedPromotionMethods",
                p.available_regions AS "availableRegions",
                p.coupon_policy AS "couponPolicy",
                p.return_policy AS "returnPolicy",
                p.content_requirements AS "contentRequirements",
                p.special_terms AS "specialTerms",
                p.offer_starts_at AS "offerStartsAt",
                p.offer_ends_at AS "offerEndsAt",
                p.terms_version AS "termsVersion"
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
            offer.commissionValue !== input.acceptedCommissionValue ||
            offer.termsVersion !== input.acceptedTermsVersion
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
              acceptedTerms: {
                version: offer.termsVersion,
                productType: offer.productType,
                commissionType: offer.commissionType,
                commissionValue: offer.commissionValue,
                cookieWindowDays: offer.cookieWindowDays,
                payoutTiming: offer.payoutTiming,
                allowedChannels: offer.allowedChannels,
                prohibitedPromotionMethods: offer.prohibitedPromotionMethods,
                availableRegions: offer.availableRegions,
                couponPolicy: offer.couponPolicy,
                returnPolicy: offer.returnPolicy,
                contentRequirements: offer.contentRequirements,
                specialTerms: offer.specialTerms,
                offerStartsAt: offer.offerStartsAt?.toISOString() ?? null,
                offerEndsAt: offer.offerEndsAt?.toISOString() ?? null,
              },
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

export interface CreatorLinkCatalogQuery {
  q?: string;
  productType?: ProductTypeValue;
  brandId?: string;
  resolution?: "ACTIVE" | "DISABLED";
  sort?: "newest" | "title" | "brand" | "commission_high";
  page?: number;
  pageSize?: number;
}

function resolvedActiveWhere(creatorId: string): Prisma.TrackingLinkWhereInput {
  return {
    status: "ACTIVE",
    product: {
      status: "ACTIVE",
      brand: {
        status: "APPROVED",
        partnerships: {
          some: { creatorId, status: "APPROVED" },
        },
      },
    },
  };
}

function creatorLinkCatalogWhere(
  creatorId: string,
  query: CreatorLinkCatalogQuery,
): Prisma.TrackingLinkWhereInput {
  const activeWhere = resolvedActiveWhere(creatorId);
  const conditions: Prisma.TrackingLinkWhereInput[] = [];
  if (query.brandId) conditions.push({ product: { brandId: query.brandId } });
  if (query.productType)
    conditions.push({ product: { productType: query.productType } });
  if (query.q)
    conditions.push({
      product: {
        OR: [
          { title: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
          { sku: { contains: query.q, mode: "insensitive" } },
          {
            brand: { name: { contains: query.q, mode: "insensitive" } },
          },
        ],
      },
    });
  if (query.resolution === "ACTIVE") conditions.push(activeWhere);
  if (query.resolution === "DISABLED") conditions.push({ NOT: activeWhere });
  return {
    creatorId,
    ...(conditions.length ? { AND: conditions } : {}),
  };
}

export async function listCreatorLinkCatalog(
  creatorId: string,
  query: CreatorLinkCatalogQuery = {},
) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 6, 1), 48);
  const requestedPage = Math.max(query.page ?? 1, 1);
  const where = creatorLinkCatalogWhere(creatorId, query);
  const total = await prisma.trackingLink.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const orderBy: Prisma.TrackingLinkOrderByWithRelationInput[] =
    query.sort === "title"
      ? [{ product: { title: "asc" } }]
      : query.sort === "brand"
        ? [
            { product: { brand: { name: "asc" } } },
            { product: { title: "asc" } },
          ]
        : query.sort === "commission_high"
          ? [{ commissionValue: "desc" }, { product: { title: "asc" } }]
          : [{ createdAt: "desc" }, { product: { title: "asc" } }];
  const items = await prisma.trackingLink.findMany({
    where,
    include: {
      product: { include: { brand: true } },
      creator: { include: { partnerships: true } },
    },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { items, total, page, pageSize, pageCount };
}

export async function listCreatorLinkBrands(creatorId: string) {
  return prisma.brand.findMany({
    where: {
      products: { some: { links: { some: { creatorId } } } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
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
      description: true,
      sku: true,
      productType: true,
      priceGel: true,
      imageUrls: true,
      commissionType: true,
      commissionValue: true,
      cookieWindowDays: true,
      payoutTiming: true,
      allowedChannels: true,
      prohibitedPromotionMethods: true,
      availableRegions: true,
      couponPolicy: true,
      returnPolicy: true,
      contentRequirements: true,
      specialTerms: true,
      offerStartsAt: true,
      offerEndsAt: true,
      termsVersion: true,
      brand: { select: { name: true } },
    },
    orderBy: [{ brand: { name: "asc" } }, { title: "asc" }],
  });
  return products.map((product) => ({
    productId: product.id,
    title: product.title,
    description: product.description,
    sku: product.sku,
    productType: product.productType,
    priceGel: product.priceGel.toFixed(2),
    imageUrls: product.imageUrls,
    brandName: product.brand.name,
    commissionType: product.commissionType,
    commissionValue: product.commissionValue.toFixed(4),
    cookieWindowDays: product.cookieWindowDays,
    payoutTiming: product.payoutTiming,
    allowedChannels: product.allowedChannels,
    prohibitedPromotionMethods: product.prohibitedPromotionMethods,
    availableRegions: product.availableRegions,
    couponPolicy: product.couponPolicy,
    returnPolicy: product.returnPolicy,
    contentRequirements: product.contentRequirements,
    specialTerms: product.specialTerms,
    offerStartsAt: product.offerStartsAt,
    offerEndsAt: product.offerEndsAt,
    termsVersion: product.termsVersion,
  }));
}

export interface CreatorOfferCatalogQuery {
  q?: string;
  productType?: ProductTypeValue;
  commissionType?: "PERCENT" | "FIXED";
  sort?: "newest" | "title" | "price_low" | "commission_high";
  page?: number;
  pageSize?: number;
}

function creatorCatalogWhere(
  creatorId: string,
  query: CreatorOfferCatalogQuery = {},
): Prisma.ProductWhereInput {
  return {
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
    ...(query.productType ? { productType: query.productType } : {}),
    ...(query.commissionType ? { commissionType: query.commissionType } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { sku: { contains: query.q, mode: "insensitive" } },
            { brand: { name: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

const creatorOfferSelect = {
  id: true,
  sku: true,
  title: true,
  description: true,
  productType: true,
  priceGel: true,
  imageUrls: true,
  backlinkUrl: true,
  commissionType: true,
  commissionValue: true,
  cookieWindowDays: true,
  payoutTiming: true,
  allowedChannels: true,
  prohibitedPromotionMethods: true,
  availableRegions: true,
  couponPolicy: true,
  returnPolicy: true,
  contentRequirements: true,
  specialTerms: true,
  offerStartsAt: true,
  offerEndsAt: true,
  termsVersion: true,
  termsUpdatedAt: true,
  brand: { select: { name: true } },
  links: {
    where: { status: "ACTIVE" as const },
    select: { id: true, code: true, createdAt: true },
    take: 1,
  },
} satisfies Prisma.ProductSelect;

function serializeCreatorOffer<
  T extends {
    priceGel: Prisma.Decimal;
    commissionValue: Prisma.Decimal;
    brand: { name: string };
  },
>(product: T) {
  return {
    ...product,
    brandName: product.brand.name,
    priceGel: product.priceGel.toFixed(2),
    commissionValue: product.commissionValue.toFixed(4),
  };
}

export async function listProductOffersForCreator(
  creatorId: string,
  query: CreatorOfferCatalogQuery = {},
) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 48);
  const requestedPage = Math.max(query.page ?? 1, 1);
  const where = creatorCatalogWhere(creatorId, query);
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "title"
      ? [{ title: "asc" }]
      : query.sort === "price_low"
        ? [{ priceGel: "asc" }, { title: "asc" }]
        : query.sort === "commission_high"
          ? [{ commissionValue: "desc" }, { title: "asc" }]
          : [{ createdAt: "desc" }, { title: "asc" }];
  const products = await prisma.product.findMany({
    where,
    select: {
      ...creatorOfferSelect,
      links: {
        ...creatorOfferSelect.links,
        where: { creatorId, status: "ACTIVE" },
      },
    },
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    items: products.map(serializeCreatorOffer),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getProductOfferForCreator(
  creatorId: string,
  productId: string,
) {
  if (!UUID.test(productId)) return undefined;
  const product = await prisma.product.findFirst({
    where: { id: productId, ...creatorCatalogWhere(creatorId) },
    select: {
      ...creatorOfferSelect,
      links: {
        ...creatorOfferSelect.links,
        where: { creatorId, status: "ACTIVE" },
      },
    },
  });
  return product === null ? undefined : serializeCreatorOffer(product);
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

export async function listResolvedLinksForBrandProduct(
  brandId: string,
  productId: string,
) {
  return prisma.trackingLink.findMany({
    where: { productId, product: { brandId } },
    include: {
      product: { include: { brand: true } },
      creator: { include: { partnerships: true } },
    },
    orderBy: [{ status: "asc" }, { creator: { displayName: "asc" } }],
  });
}
