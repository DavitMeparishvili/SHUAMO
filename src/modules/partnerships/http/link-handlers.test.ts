import { describe, expect, it } from "vitest";
import { createProductLinkHandler } from "./link-handlers";

const acceptedBody = {
  productId: "p1",
  commissionType: "FIXED",
  commissionValue: "8.0000",
  termsVersion: 1,
} as const;

describe("creator product link handler", () => {
  it("creates one link for the authenticated creator and accepted product terms", async () => {
    const calls: unknown[] = [];
    const response = await createProductLinkHandler(async (...args) => {
      calls.push(args);
      return {
        ok: true,
        value: {
          linkId: "l1",
          code: "ABCDEFGH",
          commissionType: "FIXED",
          commissionValue: "8.0000",
        },
      };
    })(
      "c1",
      new Request("https://shuamo.test", {
        method: "POST",
        body: JSON.stringify(acceptedBody),
      }),
    );

    expect(response.status).toBe(201);
    expect(calls).toEqual([["c1", acceptedBody]]);
  });

  it.each([
    ["product_not_found", 404],
    ["brand_not_approved", 403],
    ["creator_not_approved", 403],
    ["partnership_not_approved", 403],
    ["offer_changed", 409],
    ["active_link_exists", 409],
  ] as const)("maps %s to %i", async (error, status) => {
    const response = await createProductLinkHandler(async () => ({
      ok: false,
      error,
    }))(
      "c1",
      new Request("https://shuamo.test", {
        method: "POST",
        body: JSON.stringify(acceptedBody),
      }),
    );
    expect(response.status).toBe(status);
  });

  it.each([
    {},
    { productId: "p1" },
    { ...acceptedBody, unexpected: true },
    { ...acceptedBody, commissionType: "OTHER" },
    { ...acceptedBody, commissionValue: "" },
  ])("rejects invalid or incomplete accepted terms %#", async (body) => {
    const response = await createProductLinkHandler(async () => {
      throw new Error("unreachable");
    })(
      "c1",
      new Request("https://shuamo.test", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(400);
  });
});
