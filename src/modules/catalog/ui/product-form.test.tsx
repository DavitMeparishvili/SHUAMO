// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductForm, type ProductFormCopy } from "./product-form";

const copy: ProductFormCopy = {
  sku: "SKU",
  title: "Title",
  description: "Description",
  sectionProduct: "Product information",
  sectionProductIntro: "Product details",
  sectionOffer: "Commission offer",
  sectionTerms: "Affiliate terms",
  sectionTermsIntro: "Accepted terms are preserved.",
  productType: "Product type",
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
  price: "Price",
  backlink: "Backlink URL",
  rateType: "Rate type",
  percent: "%",
  fixed: "Fixed GEL",
  commission: "Commission value",
  cookieWindow: "Cookie window",
  days: "days",
  payoutTiming: "Payout timing",
  payoutTimings: {
    AFTER_CONFIRMED_CONVERSION: "After confirmation",
    MONTHLY: "Monthly",
    CUSTOM: "Custom",
  },
  allowedChannels: "Allowed channels",
  channelLabels: {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube",
    FACEBOOK: "Facebook",
    BLOG: "Blog",
    EMAIL: "Email",
    PODCAST: "Podcast",
    OTHER: "Other",
  },
  prohibitedMethods: "Prohibited promotion",
  prohibitedLabels: {
    PAID_SEARCH: "Paid search",
    PAID_SOCIAL: "Paid social",
    COUPON_SITES: "Coupon sites",
    EMAIL_SPAM: "Email spam",
    SELF_REFERRALS: "Self referrals",
    TRADEMARK_BIDDING: "Trademark bidding",
  },
  regions: "Regions",
  regionsHint: "Country codes",
  couponPolicy: "Coupon policy",
  returnPolicy: "Return policy",
  contentRequirements: "Content requirements",
  specialTerms: "Special terms",
  offerStartsAt: "Offer starts",
  offerEndsAt: "Offer ends",
  optional: "optional",
  storedFraction: "Stored fraction",
  estimateSale: "Catalogue sale (estimate)",
  estimateEarnings: "Creator earnings (estimate)",
  addImage: "Add image",
  primaryImage: "Primary image",
  moveEarlier: "Move earlier",
  moveLater: "Move later",
  removeImage: "Remove",
  imageTypes: "Up to 8 images, 5 MB each.",
  imageAfterPublishTitle: "Publish before adding images",
  imageAfterPublishBody: "You can upload from the saved product page.",
  uploadFailed: "The image could not be uploaded",
  fileTooLarge: "Choose an image no larger than 5 MB.",
  retry: "Retry",
  uploading: "Uploading",
  publish: "Publish product",
  save: "Save changes",
  archive: "Archive product",
  warningTitle: "Rate warning",
  warningBody: "Future conversions use this rate.",
};

const initial = {
  id: "11111111-1111-4111-8111-111111111111",
  sku: "P-1",
  title: "Product",
  description: "",
  productType: "OTHER" as const,
  priceGel: "100.00",
  imageUrls: [],
  backlinkUrl: "https://example.ge/product",
  commissionType: "PERCENT" as const,
  commissionValue: "0.1",
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
};

afterEach(() => vi.unstubAllGlobals());

describe("ProductForm image flow", () => {
  it("defers uploads until a real product exists", () => {
    render(<ProductForm action={() => undefined} copy={copy} />);

    expect(screen.queryByLabelText(copy.addImage)).not.toBeInTheDocument();
    expect(screen.getByText(copy.imageAfterPublishBody)).toBeVisible();
  });

  it("rejects files over 5 MB before requesting a presign URL", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <ProductForm action={() => undefined} copy={copy} initial={initial} />,
    );

    const input = screen.getByLabelText(copy.addImage);
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(copy.fileTooLarge)).toBeVisible(),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: copy.retry })).toBeNull();
  });

  it("gives the hidden file input a visible focus-within treatment", () => {
    render(
      <ProductForm action={() => undefined} copy={copy} initial={initial} />,
    );

    expect(screen.getByLabelText(copy.addImage).closest("label")).toHaveClass(
      "focus-within:ring-4",
    );
  });

  it("renders exact GEL preview amounts with the money component", () => {
    render(
      <ProductForm action={() => undefined} copy={copy} initial={initial} />,
    );

    expect(screen.getByText("100.00 ₾")).toHaveClass("type-mono");
    expect(screen.getByText("10.00 ₾")).toHaveClass("type-mono");
  });
});
