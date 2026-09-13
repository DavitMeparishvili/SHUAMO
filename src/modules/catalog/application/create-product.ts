import type { Result } from "@/src/modules/shared";
import type { ProductRepository } from "../ports/product-repository";
import type { ProductInput, ProductInputError } from "./product-input";
import { validateProductInput } from "./product-input";

interface CreateProductScope {
  products: Pick<ProductRepository, "create" | "findBrandSku">;
}

export interface CreateProductDeps extends CreateProductScope {
  reservedId?: string | undefined;
  validateImages?: ((values: readonly string[]) => boolean) | undefined;
  transaction?:
    | (<T>(work: (scope: CreateProductScope) => Promise<T>) => Promise<T>)
    | undefined;
}

export type CreateProductError = "duplicate_sku" | ProductInputError;

export function createProduct(deps: CreateProductDeps) {
  return async (
    brandId: string,
    input: ProductInput,
  ): Promise<Result<{ id: string }, CreateProductError>> => {
    if (deps.transaction) {
      return deps.transaction((scope) =>
        createProduct({ ...deps, ...scope, transaction: undefined })(
          brandId,
          input,
        ),
      );
    }
    // Only the server-authorized reservation flow can attach images on create.
    // The ordinary API continues rejecting unscoped image URLs.
    if (
      (input.imageUrls?.length ?? 0) > 0 &&
      (!deps.reservedId || !deps.validateImages?.(input.imageUrls ?? []))
    ) {
      return { ok: false, error: "invalid_images" };
    }
    const parsed = validateProductInput(brandId, input);
    if (!parsed.ok) return parsed;
    if (await deps.products.findBrandSku(brandId, parsed.value.sku)) {
      return { ok: false, error: "duplicate_sku" };
    }

    const product = await deps.products.create(parsed.value, deps.reservedId);
    return { ok: true, value: { id: product.id } };
  };
}
