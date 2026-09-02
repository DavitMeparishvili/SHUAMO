import { describe, expect, it } from "vitest";
import {
  ProductLinkCreateError,
  type ProductLinkAcceptance,
  type ProductLinkWrite,
} from "../ports/link-repository";
import { createProductLink } from "./create-product-link";

const acceptance: ProductLinkAcceptance = {
  productId: "p1",
  commissionType: "PERCENT",
  commissionValue: "0.1250",
  termsVersion: 1,
};

function deps(
  createAccepted: (input: ProductLinkWrite) => Promise<{
    id: string;
    code: string;
    commissionType: "PERCENT" | "FIXED";
    commissionValue: string;
  }> = async (input) => ({
    id: "l1",
    code: input.code,
    commissionType: input.acceptedCommissionType,
    commissionValue: input.acceptedCommissionValue,
  }),
) {
  return {
    links: { createAccepted },
    random: { bytes: (count: number) => new Uint8Array(count).fill(1) },
  };
}

describe("createProductLink", () => {
  it("ATTR-002 and ATTR-006 atomically accepts the displayed product terms", async () => {
    const writes: ProductLinkWrite[] = [];
    const result = await createProductLink(
      deps(async (input) => {
        writes.push(input);
        return {
          id: "l1",
          code: input.code,
          commissionType: input.acceptedCommissionType,
          commissionValue: input.acceptedCommissionValue,
        };
      }),
    )("c1", acceptance);

    expect(result).toEqual({
      ok: true,
      value: {
        linkId: "l1",
        code: expect.any(String),
        commissionType: "PERCENT",
        commissionValue: "0.1250",
      },
    });
    expect(writes).toEqual([
      expect.objectContaining({
        productId: "p1",
        creatorId: "c1",
        acceptedCommissionType: "PERCENT",
        acceptedCommissionValue: "0.1250",
      }),
    ]);
  });

  it.each([
    "product_not_found",
    "brand_not_approved",
    "creator_not_approved",
    "partnership_not_approved",
    "offer_changed",
    "active_link_exists",
  ] as const)("maps atomic persistence failure %s", async (error) => {
    expect(
      await createProductLink(
        deps(async () => {
          throw new ProductLinkCreateError(error);
        }),
      )("c1", acceptance),
    ).toEqual({ ok: false, error });
  });

  it("does not hide unrelated repository failures", async () => {
    await expect(
      createProductLink(
        deps(async () => {
          throw new Error("database down");
        }),
      )("c1", acceptance),
    ).rejects.toThrow("database down");
  });
});
