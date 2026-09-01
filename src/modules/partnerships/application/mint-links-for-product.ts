import { generateLinkCode } from "../domain/link-code";
import { linksToMint } from "../domain/link-minting";

export function mintLinksForProduct(deps: {
  partnerships: { listApprovedCreatorIds(brandId: string): Promise<string[]> };
  links: {
    listForProducts(
      productIds: readonly string[],
    ): Promise<{ productId: string; creatorId: string }[]>;
    createMany(
      pairs: readonly { productId: string; creatorId: string; code: string }[],
    ): Promise<void>;
  };
  random: { bytes(count: number): Uint8Array };
}) {
  return async (brandId: string, productId: string): Promise<number> => {
    const creatorIds = await deps.partnerships.listApprovedCreatorIds(brandId);
    const pairs = linksToMint({
      products: [{ id: productId, status: "ACTIVE" }],
      creators: creatorIds.map((id) => ({
        id,
        partnershipStatus: "APPROVED" as const,
      })),
      existing: await deps.links.listForProducts([productId]),
    });
    await deps.links.createMany(
      pairs.map((pair) => ({ ...pair, code: generateLinkCode(deps.random) })),
    );
    return pairs.length;
  };
}
