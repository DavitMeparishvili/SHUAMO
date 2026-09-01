import type { Result } from "@/src/modules/shared";
import type { ProductRepository } from "../ports/product-repository";
import type { ProductInput, ProductInputError } from "./product-input";
import { validateProductInput } from "./product-input";

interface CreateProductScope {
  products: Pick<ProductRepository, "create" | "findBrandSku">;
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
    Result<{ id: string }, CreateProductError>
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
    return { ok: true, value: { id: product.id } };
  };
}
