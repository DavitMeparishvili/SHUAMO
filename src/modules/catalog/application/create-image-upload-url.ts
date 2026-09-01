import type { Result } from "@/src/modules/shared";
import {
  buildImageObjectKey,
  parseImageContentType,
  publicImageUrl,
} from "../domain/image-upload";
import type { ImageStoragePort } from "../ports/image-storage";

export interface CreateImageUploadUrlDeps {
  products: {
    findOwned(
      brandId: string,
      productId: string,
    ): Promise<{ id: string } | undefined>;
  };
  storage: ImageStoragePort;
  random: { uuid(): string };
  config: { publicEndpoint: string; bucket: string };
}

export function createImageUploadUrl(deps: CreateImageUploadUrlDeps) {
  return async (
    brandId: string,
    productId: string,
    input: { contentType: string },
  ): Promise<
    Result<
      { uploadUrl: string; publicUrl: string },
      "not_found" | "unsupported_content_type"
    >
  > => {
    const product = await deps.products.findOwned(brandId, productId);
    if (!product) return { ok: false, error: "not_found" };
    const contentType = parseImageContentType(input.contentType);
    if (!contentType.ok) return contentType;
    const key = buildImageObjectKey({
      brandId,
      productId,
      contentType: contentType.value,
      random: deps.random,
    });
    const uploadUrl = await deps.storage.presignPut({
      key,
      contentType: contentType.value,
    });
    return {
      ok: true,
      value: {
        uploadUrl,
        publicUrl: publicImageUrl({
          publicEndpoint: deps.config.publicEndpoint,
          bucket: deps.config.bucket,
          key,
        }),
      },
    };
  };
}
