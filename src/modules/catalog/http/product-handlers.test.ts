import { describe, expect, it } from "vitest";
import { createProductPostHandler } from "./product-handlers";

describe("product post handler", () => {
  it("creates a product without minting links", async () => {
    const handler = createProductPostHandler({
      products: {
        findBrandSku: async () => undefined,
        create: async (input) => ({ id: "p1", status: "ACTIVE", ...input }),
      },
    });
    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          sku: "P1",
          title: "Product",
          priceGel: "10.00",
          backlinkUrl: "https://example.ge",
          commissionType: "FIXED",
          commissionValue: "1",
        }),
      }),
      "b1",
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "p1" });
  });
  it("rejects a percent whole-number typo in the Zod schema", async () => {
    const handler = createProductPostHandler({
      products: {
        findBrandSku: async () => undefined,
        create: async (input) => ({ id: "p1", status: "ACTIVE", ...input }),
      },
    });
    const response = await handler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          sku: "BAD",
          title: "Bad rate",
          priceGel: "10.00",
          backlinkUrl: "https://example.ge",
          commissionType: "PERCENT",
          commissionValue: "12.5",
        }),
      }),
      "b1",
    );
    expect(response.status).toBe(400);
  });
});
