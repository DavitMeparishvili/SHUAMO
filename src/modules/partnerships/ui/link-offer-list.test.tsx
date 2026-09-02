import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LinkOfferList } from "./link-offer-list";

describe("LinkOfferList", () => {
  it("renders the product, brand, offered rate, and explicit acceptance", () => {
    const html = renderToStaticMarkup(
      <LinkOfferList
        offers={[
          {
            productId: "p1",
            title: "Amber candle",
            brandName: "Aroma",
            imageUrls: [],
            commissionType: "FIXED",
            commissionValue: "8.0000",
          },
        ]}
        locale="en"
        copy={{
          title: "Available products",
          empty: "No offers",
          browse: "Browse all products",
          view: "View offer",
        }}
      />,
    );
    expect(html).toContain("Amber candle");
    expect(html).toContain("Aroma");
    expect(html).toContain("8.00 ₾");
    expect(html).toContain("View offer");
    expect(html).toContain('href="/en/creator/products/p1"');
  });
});
