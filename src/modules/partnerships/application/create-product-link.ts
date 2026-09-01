import type { Result } from "@/src/modules/shared";
import {
  generateLinkCode,
  type LinkCodeRandomSource,
} from "../domain/link-code";
import {
  ActiveLinkExistsError,
  type LinkRepository,
} from "../ports/link-repository";
import type { PartnershipRepository } from "../ports/partnership-repository";

export type ProductLinkError =
  "product_not_found" | "partnership_not_approved" | "active_link_exists";

export interface ProductLinkCreated {
  readonly linkId: string;
  readonly code: string;
  readonly commissionType: "PERCENT" | "FIXED";
  readonly commissionValue: string;
}

export function createProductLink(deps: {
  products: {
    findActiveOffer(productId: string): Promise<
      | {
          id: string;
          brandId: string;
          commissionType: "PERCENT" | "FIXED";
          commissionValue: string;
        }
      | undefined
    >;
  };
  partnerships: Pick<PartnershipRepository, "find">;
  links: Pick<LinkRepository, "findActive" | "create">;
  random: LinkCodeRandomSource;
}) {
  return async (
    creatorId: string,
    productId: string,
  ): Promise<Result<ProductLinkCreated, ProductLinkError>> => {
    const offer = await deps.products.findActiveOffer(productId);
    if (offer === undefined) return { ok: false, error: "product_not_found" };

    const partnership = await deps.partnerships.find(offer.brandId, creatorId);
    if (partnership?.status !== "APPROVED") {
      return { ok: false, error: "partnership_not_approved" };
    }
    if (await deps.links.findActive(productId, creatorId)) {
      return { ok: false, error: "active_link_exists" };
    }

    try {
      const link = await deps.links.create({
        productId,
        creatorId,
        code: generateLinkCode(deps.random),
        commissionType: offer.commissionType,
        commissionValue: offer.commissionValue,
      });
      return {
        ok: true,
        value: {
          linkId: link.id,
          code: link.code,
          commissionType: link.commissionType,
          commissionValue: link.commissionValue,
        },
      };
    } catch (error) {
      if (error instanceof ActiveLinkExistsError) {
        return { ok: false, error: "active_link_exists" };
      }
      throw error;
    }
  };
}
