import { verifyProductImages } from "./verify-product-images";
import { prisma } from "@/src/infrastructure/db/client";
import {
  archiveProduct,
  createProduct,
  parseProductImageUrls,
  prismaProductRepository,
  updateProduct,
  type ProductInput,
} from "@/src/modules/catalog";
import {
  applyToBrand,
  createProductLink,
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

export async function createProductForBrand(
  brandId: string,
  input: ProductInput,
  reservedId?: string,
) {
  const env = serverEnv();
  if (
    (input.imageUrls?.length ?? 0) > 0 &&
    (!reservedId ||
      !(await verifyProductImages(brandId, reservedId, input.imageUrls ?? [])))
  )
    return { ok: false as const, error: "invalid_images" as const };
  return createProduct({
    products: prismaProductRepository,
    reservedId,
    validateImages: (values) =>
      parseProductImageUrls({
        values,
        brandId,
        productId: reservedId ?? "",
        publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
        bucket: env.STORAGE_BUCKET,
      }).ok,
  })(brandId, input);
}

export async function updateProductForBrand(
  brandId: string,
  productId: string,
  input: ProductInput,
) {
  const env = serverEnv();
  const current = await prismaProductRepository.findOwned(brandId, productId);
  if (!current) return { ok: false as const, error: "not_found" as const };
  const newImages = (input.imageUrls ?? []).filter(
    (url) => !current.imageUrls.includes(url),
  );
  if (!(await verifyProductImages(brandId, productId, newImages)))
    return { ok: false as const, error: "invalid_images" as const };
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
  return decidePartnership({ partnerships: prismaPartnershipRepository })(
    brandId,
    partnershipId,
    decision,
  );
}

export async function inviteCreatorForBrand(
  brandId: string,
  creatorId: string,
) {
  return inviteCreator({
    creators: {
      async findById(id) {
        return (
          (await prisma.creator.findUnique({
            where: { id },
            select: { id: true, status: true },
          })) ?? undefined
        );
      },
    },
    partnerships: prismaPartnershipRepository,
  })(brandId, creatorId);
}

export const setLinkStatusForBrand = setLinkStatus({
  links: prismaLinkRepository,
});

export const createProductLinkForCreator = createProductLink({
  links: prismaLinkRepository,
  random,
});
