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
  it("mints for every approved creator", async () => {
    const minted: unknown[] = [];
    const result = await createProduct({
      products: {
        findBrandSku: async () => undefined,
        create: async (input) => ({ id: "p1", status: "ACTIVE", ...input }),
      },
      partnerships: { listApprovedCreatorIds: async () => ["c1", "c2"] },
      links: {
        listForProducts: async () => [],
        createMany: async (pairs) => void minted.push(...pairs),
      },
      random: { bytes: (n) => new Uint8Array(n).fill(1) },
    })("b1", valid);
    expect(result).toEqual({ ok: true, value: { id: "p1", mintedLinks: 2 } });
    expect(minted).toHaveLength(2);
  });
  it("refuses a duplicate SKU before minting", async () => {
    let touched = false;
    const result = await createProduct({
      products: {
        findBrandSku: async () => ({ id: "old" }),
        create: async () => {
          throw new Error("unreachable");
        },
      },
      partnerships: { listApprovedCreatorIds: async () => [] },
      links: {
        listForProducts: async () => [],
        createMany: async () => void (touched = true),
      },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", valid);
    expect(result).toEqual({ ok: false, error: "duplicate_sku" });
    expect(touched).toBe(false);
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
      partnerships: { listApprovedCreatorIds: async () => [] },
      links: {
        listForProducts: async () => [],
        createMany: async () => undefined,
      },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", { ...valid, imageUrls: ["https://attacker.example/image.jpg"] });

    expect(result).toEqual({ ok: false, error: "invalid_images" });
    expect(created).toBe(false);
  });
});
