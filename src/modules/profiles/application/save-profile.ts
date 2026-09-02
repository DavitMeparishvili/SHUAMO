import type {
  BrandProfileInput,
  CreatorProfileInput,
} from "../domain/profile-content";
import {
  brandProfileInputSchema,
  creatorProfileInputSchema,
} from "./profile-schemas";

export function saveBrandProfile(deps: {
  save(brandId: string, input: BrandProfileInput): Promise<unknown>;
  productIdsOwned(brandId: string, ids: string[]): Promise<boolean>;
}) {
  return async (brandId: string, raw: unknown) => {
    const parsed = brandProfileInputSchema.safeParse(raw);
    if (!parsed.success)
      return {
        ok: false as const,
        error: "invalid" as const,
        issues: parsed.error.flatten(),
      };
    if (!(await deps.productIdsOwned(brandId, parsed.data.featuredProductIds)))
      return { ok: false as const, error: "foreign_product" as const };
    return { ok: true as const, value: await deps.save(brandId, parsed.data) };
  };
}
export function saveCreatorProfile(deps: {
  save(creatorId: string, input: CreatorProfileInput): Promise<unknown>;
}) {
  return async (creatorId: string, raw: unknown) => {
    const parsed = creatorProfileInputSchema.safeParse(raw);
    if (!parsed.success)
      return {
        ok: false as const,
        error: "invalid" as const,
        issues: parsed.error.flatten(),
      };
    return {
      ok: true as const,
      value: await deps.save(creatorId, parsed.data),
    };
  };
}
