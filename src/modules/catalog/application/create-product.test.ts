import { describe, expect, it } from "vitest";
import { createProduct } from "./create-product";

const valid = {
  sku: "P-1",
  title: "Product",
  priceGel: "100.00",
  backlinkUrl: "https://example.ge",
  commissionType: "PERCENT" as const,
  commissionValue: "0.1",
};

describe("createProduct", () => {
  it("ATTR-002 product creation never creates creator links", async () => {
    const result = await createProduct({
      products: {
        findBrandSku: async () => undefined,
        create: async (input) => ({ id: "p1", status: "ACTIVE", ...input }),
      },
    })("b1", valid);
    expect(result).toEqual({ ok: true, value: { id: "p1" } });
  });

  it("refuses a duplicate SKU", async () => {
    const result = await createProduct({
      products: {
        findBrandSku: async () => ({ id: "old" }),
        create: async () => {
          throw new Error("unreachable");
        },
      },
    })("b1", valid);
    expect(result).toEqual({ ok: false, error: "duplicate_sku" });
  });

  it("rejects image URLs on create before writing a product", async () => {
    let created = false;
    const result = await createProduct({
      products: {
        findBrandSku: async () => undefined,
        create: async (input) => {
          created = true;
          return { id: "p1", status: "ACTIVE", ...input };
        },
      },
    })("b1", { ...valid, imageUrls: ["https://attacker.example/image.jpg"] });
    expect(result).toEqual({ ok: false, error: "invalid_images" });
    expect(created).toBe(false);
  });
});
