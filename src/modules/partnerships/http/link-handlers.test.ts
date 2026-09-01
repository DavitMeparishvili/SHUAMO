import { describe, expect, it } from "vitest";
import { createProductLinkHandler } from "./link-handlers";

describe("creator product link handler", () => {
  it("creates one link for the authenticated creator and selected product", async () => {
    const response = await createProductLinkHandler(async () => ({
      ok: true,
      value: {
        linkId: "l1",
        code: "ABCDEFGH",
        commissionType: "FIXED",
        commissionValue: "8.0000",
      },
    }))(
      "c1",
      new Request("https://shuamo.test", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
      }),
    );
    expect(response.status).toBe(201);
  });

  it.each([
    ["product_not_found", 404],
    ["partnership_not_approved", 403],
    ["active_link_exists", 409],
  ] as const)("maps %s to %i", async (error, status) => {
    const response = await createProductLinkHandler(async () => ({
      ok: false,
      error,
    }))(
      "c1",
      new Request("https://shuamo.test", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
      }),
    );
    expect(response.status).toBe(status);
  });

  it("rejects an invalid body", async () => {
    const response = await createProductLinkHandler(async () => {
      throw new Error("unreachable");
    })(
      "c1",
      new Request("https://shuamo.test", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });
});
