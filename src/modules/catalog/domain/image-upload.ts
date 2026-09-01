import type { Result } from "@/src/modules/shared";

export type AllowedImageContentType = "image/jpeg" | "image/png" | "image/webp";

export type ProductImageUrlError =
  "too_many_images" | "invalid_product_image_url";

const EXTENSIONS: Record<AllowedImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function parseImageContentType(
  value: string,
): Result<AllowedImageContentType, "unsupported_content_type"> {
  if (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
  ) {
    return { ok: true, value };
  }
  return { ok: false, error: "unsupported_content_type" };
}

export function buildImageObjectKey(input: {
  brandId: string;
  productId: string;
  contentType: AllowedImageContentType;
  random: { uuid: () => string };
}): string {
  return `products/${input.brandId}/${input.productId}/${input.random.uuid()}.${EXTENSIONS[input.contentType]}`;
}

export function publicImageUrl(input: {
  publicEndpoint: string;
  bucket: string;
  key: string;
}): string {
  return `${input.publicEndpoint.replace(/\/$/, "")}/${input.bucket}/${input.key}`;
}

const IMAGE_OBJECT_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

/**
 * Product writes may only persist stable URLs produced by this product's own
 * presign flow. This is deliberately stricter than generic URL validation:
 * origin, bucket, brand, product, object-name shape, query and fragment are
 * all part of the trust boundary.
 */
export function parseProductImageUrls(input: {
  values: readonly string[];
  publicEndpoint: string;
  bucket: string;
  brandId: string;
  productId: string;
}): Result<string[], ProductImageUrlError> {
  if (input.values.length > 8) {
    return { ok: false, error: "too_many_images" };
  }

  const endpoint = new URL(input.publicEndpoint);
  const endpointPath = endpoint.pathname.replace(/\/$/, "");
  const expectedPrefix = `${endpointPath}/${encodeURIComponent(input.bucket)}/products/${encodeURIComponent(input.brandId)}/${encodeURIComponent(input.productId)}/`;
  const parsed: string[] = [];

  for (const value of input.values) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { ok: false, error: "invalid_product_image_url" };
    }

    const objectName = url.pathname.startsWith(expectedPrefix)
      ? url.pathname.slice(expectedPrefix.length)
      : "";
    if (
      url.origin !== endpoint.origin ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      !IMAGE_OBJECT_NAME.test(objectName)
    ) {
      return { ok: false, error: "invalid_product_image_url" };
    }
    parsed.push(value);
  }

  return { ok: true, value: parsed };
}
