import type { Result } from "@/src/modules/shared";
import { generateLinkCode, linksToMint } from "@/src/modules/partnerships";
import type { ProductRepository } from "../ports/product-repository";
import type { ProductInput, ProductInputError } from "./product-input";
import { validateProductInput } from "./product-input";

interface CreateProductScope {
  products: Pick<ProductRepository, "create" | "findBrandSku">;
  partnerships: {
    listApprovedCreatorIds(brandId: string): Promise<string[]>;
  };
  links: {
    listForProducts(
      productIds: readonly string[],
    ): Promise<{ productId: string; creatorId: string }[]>;
    createMany(
      pairs: readonly { productId: string; creatorId: string; code: string }[],
    ): Promise<void>;
  };
  random: { bytes(count: number): Uint8Array };
}

export interface CreateProductDeps extends CreateProductScope {
  transaction?<T>(work: (scope: CreateProductScope) => Promise<T>): Promise<T>;
}

export type CreateProductError = "duplicate_sku" | ProductInputError;

export function createProduct(deps: CreateProductDeps) {
  return async (
    brandId: string,
    input: ProductInput,
  ): Promise<
    Result<{ id: string; mintedLinks: number }, CreateProductError>
  > => {
    if (deps.transaction) {
      return deps.transaction((scope) => createProduct(scope)(brandId, input));
    }
    // Images can only be uploaded after the database has assigned the real
    // product id. Reject forged create requests instead of accepting URLs
    // that could never have come from this product's presign route.
    if ((input.imageUrls?.length ?? 0) > 0) {
      return { ok: false, error: "invalid_images" };
    }
    const parsed = validateProductInput(brandId, { ...input, imageUrls: [] });
    if (!parsed.ok) return parsed;
    if (await deps.products.findBrandSku(brandId, parsed.value.sku)) {
      return { ok: false, error: "duplicate_sku" };
    }

    const product = await deps.products.create(parsed.value);
    const creatorIds = await deps.partnerships.listApprovedCreatorIds(brandId);
    const existing = await deps.links.listForProducts([product.id]);
    const pairs = linksToMint({
      products: [{ id: product.id, status: "ACTIVE" }],
      creators: creatorIds.map((id) => ({
        id,
        partnershipStatus: "APPROVED" as const,
      })),
      existing,
    });
    await deps.links.createMany(
      pairs.map((pair) => ({ ...pair, code: generateLinkCode(deps.random) })),
    );
    return { ok: true, value: { id: product.id, mintedLinks: pairs.length } };
  };
}
