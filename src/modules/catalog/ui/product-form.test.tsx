// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductForm, type ProductFormCopy } from "./product-form";

const copy: ProductFormCopy = {
  sku: "SKU",
  title: "Title",
  description: "Description",
  price: "Price",
  backlink: "Backlink URL",
  rateType: "Rate type",
  percent: "%",
  fixed: "Fixed GEL",
  commission: "Commission value",
  storedFraction: "Stored fraction",
  estimateSale: "Catalogue sale (estimate)",
  estimateEarnings: "Creator earnings (estimate)",
  addImage: "Add image",
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
  priceGel: "100.00",
  imageUrls: [],
  backlinkUrl: "https://example.ge/product",
  commissionType: "PERCENT" as const,
  commissionValue: "0.1",
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
