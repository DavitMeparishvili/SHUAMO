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
            commissionType: "FIXED",
            commissionValue: "8.0000",
          },
        ]}
        createAction={() => undefined}
        copy={{
          title: "Available products",
          empty: "No offers",
          create: "Create link at this rate",
        }}
      />,
    );
    expect(html).toContain("Amber candle");
    expect(html).toContain("Aroma");
    expect(html).toContain("8.0000 ₾");
    expect(html).toContain("Create link at this rate");
  });
});
