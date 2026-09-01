import type { Result } from "@/src/modules/shared";
import type { ProductRepository } from "../ports/product-repository";

export function archiveProduct(deps: {
  products: Pick<ProductRepository, "findOwned" | "setStatus">;
  links?: { setStatusForProduct(productId: string): Promise<void> };
}) {
  return async (
    brandId: string,
    productId: string,
  ): Promise<Result<void, "not_found" | "not_yours">> => {
    const product = await deps.products.findOwned(brandId, productId);
    if (!product) return { ok: false, error: "not_found" };
    if (product.brandId !== brandId) return { ok: false, error: "not_yours" };
    await deps.products.setStatus(productId, "ARCHIVED");
    return { ok: true, value: undefined };
  };
}
