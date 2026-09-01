import type { LinkPair } from "../domain/link-minting";

export interface MintLinkInput extends LinkPair {
  code: string;
}

export interface LinkRepository {
  listForCreator(creatorId: string): Promise<LinkPair[]>;
  listForProducts(productIds: readonly string[]): Promise<LinkPair[]>;
  createMany(links: readonly MintLinkInput[]): Promise<void>;
  setStatus(linkId: string, status: "ACTIVE" | "DISABLED"): Promise<void>;
  findOwned(
    actor: { kind: "brand" | "creator"; id: string },
    linkId: string,
  ): Promise<{ id: string } | undefined>;
}
