export type ProductLinkCreateFailure =
  | "product_not_found"
  | "brand_not_approved"
  | "creator_not_approved"
  | "partnership_not_approved"
  | "offer_changed"
  | "active_link_exists";

export class ProductLinkCreateError extends Error {
  constructor(readonly reason: ProductLinkCreateFailure) {
    super(reason);
    this.name = "ProductLinkCreateError";
  }
}

export interface ProductLinkAcceptance {
  productId: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  termsVersion: number;
}

export interface ProductLinkWrite {
  productId: string;
  creatorId: string;
  code: string;
  acceptedCommissionType: "PERCENT" | "FIXED";
  acceptedCommissionValue: string;
  acceptedTermsVersion: number;
}

export interface LinkRepository {
  createAccepted(input: ProductLinkWrite): Promise<{
    id: string;
    code: string;
    commissionType: "PERCENT" | "FIXED";
    commissionValue: string;
  }>;
  setStatus(linkId: string, status: "ACTIVE" | "DISABLED"): Promise<void>;
  findOwned(
    actor: { kind: "brand" | "creator"; id: string },
    linkId: string,
  ): Promise<{ id: string } | undefined>;
}
