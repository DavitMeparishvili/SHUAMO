import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductList } from "./product-list";

describe("ProductList", () => {
  it("links the creator-link count to the product drill-down", () => {
    const html = renderToStaticMarkup(
      <ProductList
        copy={{
          price: "Price",
          rate: "Commission",
          links: "Links",
          active: "Active",
          archived: "Archived",
          manage: "Manage product",
          imageFallback: "No image",
          cookieWindow: "Cookie window",
          days: "days",
          productTypes: {
            BEAUTY_FRAGRANCE: "Beauty / Fragrance",
            BEAUTY_SKINCARE: "Beauty / Skincare",
            BEAUTY_MAKEUP: "Beauty / Makeup",
            FASHION_CLOTHING: "Fashion / Clothing",
            FASHION_SHOES: "Fashion / Shoes",
            FASHION_ACCESSORIES: "Fashion / Accessories",
            HOME_DECOR: "Home / Decor",
            HOME_FRAGRANCE: "Home / Fragrance",
            FOOD_BEVERAGE: "Food",
            ELECTRONICS: "Electronics",
            HEALTH_WELLNESS: "Wellness",
            SPORTS_OUTDOORS: "Sports",
            BABY_KIDS: "Kids",
            BOOKS_STATIONERY: "Books",
            OTHER: "Other",
          },
          emptyTitle: "No products",
          emptyBody: "Publish one.",
        }}
        locale="en"
        products={[
          {
            id: "p1",
            sku: "AROMA-100",
            title: "Amber perfume",
            description: "Amber fragrance",
            productType: "BEAUTY_FRAGRANCE",
            imageUrls: [],
            priceGel: { toString: () => "100.00" },
            commissionType: "PERCENT",
            commissionValue: { toString: () => "0.1" },
            cookieWindowDays: 30,
            status: "ACTIVE",
            _count: { links: 3 },
          },
        ]}
      />,
    );

    expect(html).toContain('href="/en/brand/products/p1"');
    expect(html).toContain("Amber perfume");
    expect(html).toContain("Manage product");
  });
});
