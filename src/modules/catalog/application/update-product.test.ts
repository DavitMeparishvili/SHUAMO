import { describe, expect, it } from "vitest";
import { updateProduct } from "./update-product";

const current = {
  id: "p1",
  brandId: "b1",
  sku: "P-1",
  title: "Product",
  description: "",
  productType: "OTHER" as const,
  priceGel: "100.00",
  imageUrls: [],
  backlinkUrl: "https://example.ge",
  commissionType: "FIXED" as const,
  commissionValue: "10",
  cookieWindowDays: 30,
  payoutTiming: "AFTER_CONFIRMED_CONVERSION" as const,
  allowedChannels: [],
  prohibitedPromotionMethods: [],
  availableRegions: [],
  couponPolicy: "",
  returnPolicy: "",
  contentRequirements: "",
  specialTerms: "",
  offerStartsAt: null,
  offerEndsAt: null,
  termsVersion: 1,
  termsUpdatedAt: new Date(0),
  status: "ACTIVE" as const,
};

describe("updateProduct image ownership", () => {
  it("rejects forged image URLs without updating the product", async () => {
    let updated = false;
    const result = await updateProduct({
      products: {
        findOwned: async () => current,
        findBrandSku: async () => ({ id: "p1" }),
        update: async () => {
          updated = true;
          return current;
        },
      },
      validateImageUrls: () => ({
        ok: false,
        error: "invalid_product_image_url",
      }),
    })("b1", "p1", {
      ...current,
      cookieWindowDays: "30",
      offerStartsAt: "",
      offerEndsAt: "",
      imageUrls: ["https://attacker.example/forged.jpg"],
    });

    expect(result).toEqual({ ok: false, error: "invalid_images" });
    expect(updated).toBe(false);
  });
});
