import { describe, expect, it } from "vitest";
import {
  buildImageObjectKey,
  parseImageContentType,
  parseProductImageUrls,
  publicImageUrl,
} from "./image-upload";

describe("image upload domain", () => {
  it("allows only jpeg, png and webp", () => {
    expect(parseImageContentType("image/jpeg").ok).toBe(true);
    expect(parseImageContentType("image/gif")).toEqual({
      ok: false,
      error: "unsupported_content_type",
    });
  });
  it("builds scoped unique keys and public URLs", () => {
    const key = buildImageObjectKey({
      brandId: "b1",
      productId: "p1",
      contentType: "image/webp",
      random: { uuid: () => "uuid" },
    });
    expect(key).toBe("products/b1/p1/uuid.webp");
    expect(
      publicImageUrl({
        publicEndpoint: "http://localhost:9000/",
        bucket: "images",
        key,
      }),
    ).toBe(`http://localhost:9000/images/${key}`);
  });
});

describe("parseProductImageUrls", () => {
  const scope = {
    publicEndpoint: "http://localhost:9000",
    bucket: "shuamo-product-images",
    brandId: "brand-1",
    productId: "product-1",
  };
  const own =
    "http://localhost:9000/shuamo-product-images/products/brand-1/product-1/11111111-1111-4111-8111-111111111111.jpg";

  it("preserves up to eight ordered URLs scoped to the actual product", () => {
    expect(parseProductImageUrls({ ...scope, values: [own, own] })).toEqual({
      ok: true,
      value: [own, own],
    });
  });

  it.each([
    ["external origin", own.replace("localhost:9000", "cdn.example")],
    ["foreign bucket", own.replace("shuamo-product-images", "other")],
    ["foreign brand", own.replace("brand-1", "brand-2")],
    ["foreign product", own.replace("product-1", "product-2")],
    [
      "non-presigned object shape",
      own.replace(/1111[^/]+\.jpg$/, "manual.jpg"),
    ],
    ["mutable query", `${own}?version=other`],
  ])("rejects a %s URL", (_case, value) => {
    expect(parseProductImageUrls({ ...scope, values: [value] })).toEqual({
      ok: false,
      error: "invalid_product_image_url",
    });
  });
});
