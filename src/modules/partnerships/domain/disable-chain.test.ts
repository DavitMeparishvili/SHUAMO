import { describe, expect, it } from "vitest";
import { resolveLink, type LinkState } from "./disable-chain";

const live: LinkState = {
  brandStatus: "APPROVED",
  partnershipStatus: "APPROVED",
  productStatus: "ACTIVE",
  linkStatus: "ACTIVE",
};

describe("resolveLink", () => {
  it("is active only when every row passes", () =>
    expect(resolveLink(live)).toEqual({ active: true }));
  it.each([
    [{ brandStatus: "SUSPENDED" }, "BRAND_DISABLED"],
    [{ partnershipStatus: "REJECTED" }, "CREATOR_REMOVED"],
    [{ productStatus: "ARCHIVED" }, "PRODUCT_ARCHIVED"],
    [{ linkStatus: "DISABLED" }, "LINK_DISABLED"],
  ] as const)("resolves the first failing row", (override, reason) => {
    expect(resolveLink({ ...live, ...override })).toEqual({
      active: false,
      reason,
    });
  });
  it("keeps brand, creator, product, link precedence", () => {
    expect(
      resolveLink({
        brandStatus: "SUSPENDED",
        partnershipStatus: "REJECTED",
        productStatus: "ARCHIVED",
        linkStatus: "DISABLED",
      }),
    ).toEqual({ active: false, reason: "BRAND_DISABLED" });
    expect(
      resolveLink({
        ...live,
        partnershipStatus: "REJECTED",
        productStatus: "ARCHIVED",
      }),
    ).toEqual({ active: false, reason: "CREATOR_REMOVED" });
    expect(
      resolveLink({
        ...live,
        productStatus: "ARCHIVED",
        linkStatus: "DISABLED",
      }),
    ).toEqual({ active: false, reason: "PRODUCT_ARCHIVED" });
  });
});
