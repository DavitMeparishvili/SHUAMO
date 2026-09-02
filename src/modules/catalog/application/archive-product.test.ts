import { describe, expect, it } from "vitest";
import { archiveProduct } from "./archive-product";

describe("archiveProduct", () => {
  it("archives without touching tracking links", async () => {
    const touched: string[] = [];
    await archiveProduct({
      products: {
        findOwned: async () => ({
          id: "p1",
          brandId: "b1",
          sku: "P",
          title: "P",
          description: "",
          productType: "OTHER",
          priceGel: "1.00",
          imageUrls: [],
          backlinkUrl: "https://example.ge",
          commissionType: "FIXED",
          commissionValue: "1",
          cookieWindowDays: 30,
          payoutTiming: "AFTER_CONFIRMED_CONVERSION",
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
          status: "ACTIVE",
        }),
        setStatus: async (id, status) => void touched.push(`${id}:${status}`),
      },
      links: {
        setStatusForProduct: async () => void touched.push("LINKS_TOUCHED"),
      },
    })("b1", "p1");
    expect(touched).toEqual(["p1:ARCHIVED"]);
  });
});
