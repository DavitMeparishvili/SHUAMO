import { describe, expect, it } from "vitest";
import { linksToMint } from "./link-minting";

describe("linksToMint", () => {
  it("crosses active products with approved creators", () => {
    expect(
      linksToMint({
        products: [
          { id: "p1", status: "ACTIVE" },
          { id: "p2", status: "ARCHIVED" },
        ],
        creators: [
          { id: "c1", partnershipStatus: "APPROVED" },
          { id: "c2", partnershipStatus: "PENDING" },
        ],
        existing: [],
      }),
    ).toEqual([{ productId: "p1", creatorId: "c1" }]);
  });
  it("does not duplicate existing links on re-approval", () => {
    expect(
      linksToMint({
        products: [{ id: "p1", status: "ACTIVE" }],
        creators: [{ id: "c1", partnershipStatus: "APPROVED" }],
        existing: [{ productId: "p1", creatorId: "c1" }],
      }),
    ).toEqual([]);
  });
});
