export interface LinkRepository {
  setStatus(linkId: string, status: "ACTIVE" | "DISABLED"): Promise<void>;
  findOwned(
    actor: { kind: "brand" | "creator"; id: string },
    linkId: string,
  ): Promise<{ id: string } | undefined>;
}
