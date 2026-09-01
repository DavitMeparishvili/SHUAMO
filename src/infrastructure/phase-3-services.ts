import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import {
  archiveProduct,
  createPrismaProductRepository,
  createProduct,
  parseProductImageUrls,
  prismaProductRepository,
  updateProduct,
  type ProductInput,
} from "@/src/modules/catalog";
import {
  applyToBrand,
  createPrismaLinkRepository,
  createPrismaPartnershipRepository,
  decidePartnership,
  inviteCreator,
  prismaBrandLookup,
  prismaLinkRepository,
  prismaPartnershipRepository,
  setLinkStatus,
} from "@/src/modules/partnerships";
import { serverEnv } from "@/src/config/env";

const random = {
  bytes: (count: number) => crypto.getRandomValues(new Uint8Array(count)),
};

const BRAND_MUTATION_TRANSACTION = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

const MAX_TRANSACTION_ATTEMPTS = 3;

/**
 * Product publication and partnership approval both create tracking-link
 * edges. PostgreSQL READ COMMITTED cannot prevent the write-skew where each
 * transaction misses the other's uncommitted row, so every edge-producing
 * mutation for one brand takes the same transaction-scoped advisory lock.
 */
async function acquireBrandMutationLock(
  tx: Prisma.TransactionClient,
  brandId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${brandId}, 0))::text
  `;
}

async function withBrandMutationTransaction<T>(
  brandId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await acquireBrandMutationLock(tx, brandId);
        return work(tx);
      }, BRAND_MUTATION_TRANSACTION);
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
    }
  }
  throw new Error("unreachable brand mutation transaction state");
}

export async function createProductForBrand(
  brandId: string,
  input: ProductInput,
) {
  return withBrandMutationTransaction(brandId, async (tx) =>
    createProduct({
      products: createPrismaProductRepository(tx),
      partnerships: createPrismaPartnershipRepository(tx),
      links: createPrismaLinkRepository(tx),
      random,
    })(brandId, input),
  );
}

export async function updateProductForBrand(
  brandId: string,
  productId: string,
  input: ProductInput,
) {
  const env = serverEnv();
  return updateProduct({
    products: prismaProductRepository,
    validateImageUrls: ({
      brandId: ownerId,
      productId: ownedProductId,
      values,
    }) =>
      parseProductImageUrls({
        values,
        publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
        bucket: env.STORAGE_BUCKET,
        brandId: ownerId,
        productId: ownedProductId,
      }),
  })(brandId, productId, input);
}
export const archiveProductForBrand = archiveProduct({
  products: prismaProductRepository,
});

export const applyCreatorToBrand = applyToBrand({
  brands: prismaBrandLookup,
  partnerships: prismaPartnershipRepository,
});

export async function decidePartnershipForBrand(
  brandId: string,
  partnershipId: string,
  decision: "APPROVE" | "REJECT",
) {
  return withBrandMutationTransaction(brandId, async (tx) =>
    decidePartnership({
      partnerships: createPrismaPartnershipRepository(tx),
      products: createPrismaProductRepository(tx),
      links: createPrismaLinkRepository(tx),
      random,
    })(brandId, partnershipId, decision),
  );
}

export async function inviteCreatorForBrand(
  brandId: string,
  creatorId: string,
) {
  return withBrandMutationTransaction(brandId, async (tx) =>
    inviteCreator({
      creators: {
        async findById(id) {
          return (
            (await tx.creator.findUnique({
              where: { id },
              select: { id: true, status: true },
            })) ?? undefined
          );
        },
      },
      partnerships: createPrismaPartnershipRepository(tx),
      products: createPrismaProductRepository(tx),
      links: createPrismaLinkRepository(tx),
      random,
    })(brandId, creatorId),
  );
}

export const setLinkStatusForBrand = setLinkStatus({
  links: prismaLinkRepository,
});
