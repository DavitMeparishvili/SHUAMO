import type { Result } from "@/src/modules/shared";
import {
  generateLinkCode,
  type LinkCodeRandomSource,
} from "../domain/link-code";
import {
  ProductLinkCreateError,
  type LinkRepository,
  type ProductLinkAcceptance,
  type ProductLinkCreateFailure,
} from "../ports/link-repository";

export type ProductLinkError = ProductLinkCreateFailure;

export interface ProductLinkCreated {
  readonly linkId: string;
  readonly code: string;
  readonly commissionType: "PERCENT" | "FIXED";
  readonly commissionValue: string;
}

export function createProductLink(deps: {
  links: Pick<LinkRepository, "createAccepted">;
  random: LinkCodeRandomSource;
}) {
  return async (
    creatorId: string,
    acceptance: ProductLinkAcceptance,
  ): Promise<Result<ProductLinkCreated, ProductLinkError>> => {
    try {
      const link = await deps.links.createAccepted({
        productId: acceptance.productId,
        creatorId,
        code: generateLinkCode(deps.random),
        acceptedCommissionType: acceptance.commissionType,
        acceptedCommissionValue: acceptance.commissionValue,
        acceptedTermsVersion: acceptance.termsVersion,
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
      if (error instanceof ProductLinkCreateError) {
        return { ok: false, error: error.reason };
      }
      throw error;
    }
  };
}
