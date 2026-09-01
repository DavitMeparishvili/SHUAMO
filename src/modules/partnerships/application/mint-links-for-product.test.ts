import { describe, expect, it } from "vitest";
import { mintLinksForProduct } from "./mint-links-for-product";

describe("mintLinksForProduct", () => {
  it("mints one link per approved creator", async () => {
    const created: unknown[] = [];
    const count = await mintLinksForProduct({
      partnerships: { listApprovedCreatorIds: async () => ["c1", "c2"] },
      links: {
        listForProducts: async () => [],
        createMany: async (pairs) => void created.push(...pairs),
      },
      random: { bytes: (n) => new Uint8Array(n).fill(3) },
    })("b1", "p1");
    expect(count).toBe(2);
    expect(created).toHaveLength(2);
  });
});
