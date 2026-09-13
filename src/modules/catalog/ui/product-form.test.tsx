// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm, type ProductFormCopy } from "./product-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
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
  it("allows selecting images before publication without creating a product", () => {
    const action = vi.fn();
    render(
      <ProductForm action={action} copy={copy} uploadReservation="reserved" />,
    );
    expect(screen.getByLabelText(copy.addImage)).toBeEnabled();
    expect(action).not.toHaveBeenCalled();
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

    expect(screen.getAllByText("100.00 ₾")[0]).toHaveClass("type-mono");
    expect(screen.getAllByText("10.00 ₾")[0]).toHaveClass("type-mono");
  });
});

describe("Product editor save state", () => {
  it("disables unchanged saves and preserves values after server errors", async () => {
    const action = vi.fn().mockResolvedValue({ error: "duplicate_sku" });
    render(<ProductForm action={action} copy={copy} initial={initial} />);
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: copy.sku }), {
      target: { value: "duplicate" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: copy.sku })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(screen.getByRole("textbox", { name: copy.sku })).toHaveValue(
      "duplicate",
    );
    expect(screen.getByRole("textbox", { name: copy.title })).toHaveValue(
      "Product",
    );
  });
  it("expands invalid offer fields and prevents incomplete submission", async () => {
    const action = vi.fn();
    render(<ProductForm action={action} copy={copy} initial={initial} />);
    fireEvent.change(document.getElementById("commissionDisplay")!, {
      target: { value: "101" },
    });
    const offer = document.getElementById(
      "commission-offer",
    ) as HTMLDetailsElement;
    offer.open = false;
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(action).not.toHaveBeenCalled();
    expect(offer.open).toBe(true);
    expect(document.getElementById("commissionDisplay")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it("keeps description optional and enables saves only when the form differs", () => {
    render(
      <ProductForm action={() => undefined} copy={copy} initial={initial} />,
    );
    expect(screen.getByLabelText(copy.description)).not.toBeRequired();
    fireEvent.change(screen.getByRole("textbox", { name: copy.title }), {
      target: { value: "Changed" },
    });
    expect(screen.getByRole("button", { name: copy.save })).toBeEnabled();
    fireEvent.change(screen.getByRole("textbox", { name: copy.title }), {
      target: { value: initial.title },
    });
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
  });
});
