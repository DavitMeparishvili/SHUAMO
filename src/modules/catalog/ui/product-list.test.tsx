import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductList } from "./product-list";

describe("ProductList", () => {
  it("links the creator-link count to the product drill-down", () => {
    const html = renderToStaticMarkup(
      <ProductList
        copy={{
          caption: "Products",
          sku: "SKU",
          title: "Title",
          price: "Price",
          rate: "Commission",
          status: "Status",
          links: "Links",
          active: "Active",
          archived: "Archived",
          emptyTitle: "No products",
          emptyBody: "Publish one.",
        }}
        locale="en"
        products={[
          {
            id: "p1",
            sku: "AROMA-100",
            title: "Amber perfume",
            priceGel: { toString: () => "100.00" },
            commissionType: "PERCENT",
            commissionValue: { toString: () => "0.1" },
            status: "ACTIVE",
            _count: { links: 3 },
          },
        ]}
      />,
    );

    expect(html).toContain('href="/en/brand/products/p1#creator-links"');
    expect(html).toContain(">3<span");
    expect(html).toContain("Links: Amber perfume");
  });
});
