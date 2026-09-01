export class ActiveLinkExistsError extends Error {
  constructor() {
    super("an active link already exists for this product and creator");
    this.name = "ActiveLinkExistsError";
  }
}

export interface ProductLinkWrite {
  productId: string;
  creatorId: string;
  code: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

export interface LinkRepository {
  findActive(
    productId: string,
    creatorId: string,
  ): Promise<{ id: string } | undefined>;
  create(input: ProductLinkWrite): Promise<{
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
