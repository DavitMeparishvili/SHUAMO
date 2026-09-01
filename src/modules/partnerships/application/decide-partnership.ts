import type { Result } from "@/src/modules/shared";
import { generateLinkCode } from "../domain/link-code";
import { linksToMint } from "../domain/link-minting";

interface DecisionScope {
  partnerships: {
    findForBrand(
      brandId: string,
      partnershipId: string,
    ): Promise<
      | {
          id: string;
          brandId: string;
          creatorId: string;
          status: "PENDING" | "APPROVED" | "REJECTED";
        }
      | undefined
    >;
    setStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void>;
  };
  products: {
    listActiveForBrand(
      brandId: string,
    ): Promise<{ id: string; status: "ACTIVE" | "ARCHIVED" }[]>;
  };
  links: {
    listForCreator(
      creatorId: string,
    ): Promise<{ productId: string; creatorId: string }[]>;
    createMany(
      pairs: readonly { productId: string; creatorId: string; code: string }[],
    ): Promise<void>;
  };
  random: { bytes(count: number): Uint8Array };
}

export interface DecidePartnershipDeps extends DecisionScope {
  transaction?<T>(work: (scope: DecisionScope) => Promise<T>): Promise<T>;
}

export function decidePartnership(deps: DecidePartnershipDeps) {
  return async (
    brandId: string,
    partnershipId: string,
    decision: "APPROVE" | "REJECT",
  ): Promise<Result<{ mintedLinks: number }, "not_found">> => {
    if (deps.transaction) {
      return deps.transaction((scope) =>
        decidePartnership(scope)(brandId, partnershipId, decision),
      );
    }
    const partnership = await deps.partnerships.findForBrand(
      brandId,
      partnershipId,
    );
    if (!partnership) return { ok: false, error: "not_found" };

    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    await deps.partnerships.setStatus(partnership.id, status);
    if (decision === "REJECT") {
      return { ok: true, value: { mintedLinks: 0 } };
    }

    const products = await deps.products.listActiveForBrand(brandId);
    const existing = await deps.links.listForCreator(partnership.creatorId);
    const pairs = linksToMint({
      products,
      creators: [{ id: partnership.creatorId, partnershipStatus: "APPROVED" }],
      existing,
    });
    await deps.links.createMany(
      pairs.map((pair) => ({ ...pair, code: generateLinkCode(deps.random) })),
    );
    return { ok: true, value: { mintedLinks: pairs.length } };
  };
}
