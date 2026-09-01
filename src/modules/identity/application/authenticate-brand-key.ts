import { apiKeyPrefixOf, hashApiKey, keysMatch } from "../domain/api-key";
import type { BrandRepository } from "../ports/account-repository";
import { err, ok, type Result } from "@/src/modules/shared";

export function authenticateBrandKey(dependencies: {
  brands: Pick<BrandRepository, "findByKeyPrefix">;
}) {
  return async (
    presented: string,
  ): Promise<
    Result<
      { brandId: string; vatRegistered: boolean },
      "unknown_key" | "brand_not_approved"
    >
  > => {
    const prefix = apiKeyPrefixOf(presented);
    if (prefix === undefined) return err("unknown_key");
    const brand = await dependencies.brands.findByKeyPrefix(prefix);
    if (brand === undefined) return err("unknown_key");
    if (!keysMatch(hashApiKey(presented), brand.keyHash)) {
      return err("unknown_key");
    }
    if (brand.status !== "APPROVED") return err("brand_not_approved");
    return ok({ brandId: brand.id, vatRegistered: brand.vatRegistered });
  };
}
