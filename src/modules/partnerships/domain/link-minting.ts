export interface LinkPair {
  readonly productId: string;
  readonly creatorId: string;
}

export function linksToMint(input: {
  products: readonly { id: string; status: "ACTIVE" | "ARCHIVED" }[];
  creators: readonly {
    id: string;
    partnershipStatus: "PENDING" | "APPROVED" | "REJECTED";
  }[];
  existing: readonly LinkPair[];
}): LinkPair[] {
  const existing = new Set(
    input.existing.map((link) => `${link.productId}:${link.creatorId}`),
  );
  const pairs: LinkPair[] = [];

  for (const product of input.products) {
    if (product.status !== "ACTIVE") continue;
    for (const creator of input.creators) {
      if (creator.partnershipStatus !== "APPROVED") continue;
      const key = `${product.id}:${creator.id}`;
      if (existing.has(key)) continue;
      existing.add(key);
      pairs.push({ productId: product.id, creatorId: creator.id });
    }
  }
  return pairs;
}
