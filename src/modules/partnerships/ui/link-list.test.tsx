import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLinkList } from "./link-list";

const copy = {
  emptyTitle: "No creator links for this product",
  emptyBody: "Approved creators can choose this product.",
  active: "Active",
  link: "Tracking link",
  creator: "Creator",
  rate: "Agreed commission",
  enable: "Enable link",
  disable: "Disable link",
  copy: "Copy",
  copied: "Copied",
  copyError: "Copy failed",
  reasons: {
    BRAND_DISABLED: "Brand unavailable",
    CREATOR_REMOVED: "Creator removed",
    PRODUCT_ARCHIVED: "Product archived",
    LINK_DISABLED: "Link disabled",
  },
} as const;

describe("BrandLinkList", () => {
  it("shows the creator, immutable agreed rate, status, and link without repeating the scoped product", () => {
    const html = renderToStaticMarkup(
      <BrandLinkList
        baseUrl="https://shuamo.test"
        copy={copy}
        links={[
          {
            id: "l1",
            code: "ABCDEFGH",
            commissionType: "PERCENT",
            commissionValue: { toString: () => "0.125" },
            status: "ACTIVE",
            product: {
              title: "Amber perfume",
              status: "ACTIVE",
              commissionType: "PERCENT",
              commissionValue: { toString: () => "0.2" },
              brand: { id: "b1", name: "Aroma", status: "APPROVED" },
            },
            creator: {
              displayName: "Nino Beridze",
              partnerships: [{ brandId: "b1", status: "APPROVED" as const }],
            },
          },
        ]}
        setStatusAction={() => undefined}
        showProduct={false}
      />,
    );

    expect(html).toContain("Nino Beridze");
    expect(html).toContain("12.5%");
    expect(html).toContain("Active");
    expect(html).toContain("https://shuamo.test/r/ABCDEFGH");
    expect(html).not.toContain("Amber perfume");
    expect(html).not.toContain("20%");
  });

  it("renders the product-specific empty state", () => {
    const html = renderToStaticMarkup(
      <BrandLinkList
        baseUrl="https://shuamo.test"
        copy={copy}
        links={[]}
        setStatusAction={() => undefined}
        showProduct={false}
      />,
    );

    expect(html).toContain(copy.emptyTitle);
    expect(html).toContain(copy.emptyBody);
  });
});
