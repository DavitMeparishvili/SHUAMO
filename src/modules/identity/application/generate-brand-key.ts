import { mintApiKey } from "../domain/api-key";
import type { BrandRepository } from "../ports/account-repository";
import type { RandomSource } from "../ports/random-source";
import { err, ok, type Result } from "@/src/modules/shared";

export function generateBrandKey(dependencies: {
  random: RandomSource;
  brands: BrandRepository;
}) {
  return async (
    brandId: string,
  ): Promise<Result<{ plaintext: string; prefix: string }, "not_found">> => {
    if ((await dependencies.brands.findById(brandId)) === undefined) {
      return err("not_found");
    }
    const key = mintApiKey(dependencies.random);
    await dependencies.brands.updateKey(brandId, {
      keyPrefix: key.prefix,
      keyHash: key.hash,
    });
    return ok({ plaintext: key.plaintext, prefix: key.prefix });
  };
}
