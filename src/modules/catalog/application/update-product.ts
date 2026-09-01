import type { Result } from "@/src/modules/shared";
import type { ProductRepository } from "../ports/product-repository";
import type { ProductImageUrlError } from "../domain/image-upload";
import type { ProductInput, ProductInputError } from "./product-input";
import { validateProductInput } from "./product-input";

export function updateProduct(deps: {
  products: Pick<ProductRepository, "findOwned" | "findBrandSku" | "update">;
  validateImageUrls(input: {
    brandId: string;
    productId: string;
    values: readonly string[];
  }): Result<string[], ProductImageUrlError>;
}) {
  return async (
    brandId: string,
    productId: string,
    input: ProductInput,
  ): Promise<
    Result<{ id: string }, "not_found" | "duplicate_sku" | ProductInputError>
  > => {
    const current = await deps.products.findOwned(brandId, productId);
    if (!current) return { ok: false, error: "not_found" };
    const images = deps.validateImageUrls({
      brandId,
      productId,
      values: input.imageUrls ?? [],
    });
    if (!images.ok) return { ok: false, error: "invalid_images" };
    const parsed = validateProductInput(brandId, {
      ...input,
      imageUrls: images.value,
    });
    if (!parsed.ok) return parsed;
    const duplicate = await deps.products.findBrandSku(
      brandId,
      parsed.value.sku,
    );
    if (duplicate && duplicate.id !== productId) {
      return { ok: false, error: "duplicate_sku" };
    }
    const write = {
      sku: parsed.value.sku,
      title: parsed.value.title,
      description: parsed.value.description,
      priceGel: parsed.value.priceGel,
      imageUrls: parsed.value.imageUrls,
      backlinkUrl: parsed.value.backlinkUrl,
      commissionType: parsed.value.commissionType,
      commissionValue: parsed.value.commissionValue,
    };
    const updated = await deps.products.update(productId, write);
    return { ok: true, value: { id: updated.id } };
  };
}
