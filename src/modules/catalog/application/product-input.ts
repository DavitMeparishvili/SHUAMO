import { Money, type Result } from "@/src/modules/shared";
import { parseImageUrls } from "../domain/image-urls";
import { parseProductRate } from "../domain/product-rate";
import type { ProductWriteInput } from "../ports/product-repository";

export interface ProductInput {
  sku: string;
  title: string;
  description?: string | undefined;
  priceGel: string;
  imageUrls?: readonly string[] | undefined;
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

export type ProductInputError =
  | "invalid_sku"
  | "invalid_title"
  | "invalid_price"
  | "invalid_backlink_url"
  | "invalid_rate"
  | "invalid_images";

export function validateProductInput(
  brandId: string,
  input: ProductInput,
): Result<ProductWriteInput, ProductInputError> {
  const sku = input.sku.trim();
  const title = input.title.trim();
  if (sku.length === 0) return { ok: false, error: "invalid_sku" };
  if (title.length === 0) return { ok: false, error: "invalid_title" };

  let priceGel: string;
  try {
    const money = Money.of(input.priceGel.trim());
    if (money.isNegative()) return { ok: false, error: "invalid_price" };
    priceGel = money.toStorageString();
  } catch {
    return { ok: false, error: "invalid_price" };
  }

  try {
    const backlink = new URL(input.backlinkUrl);
    if (backlink.protocol !== "https:" && backlink.hostname !== "localhost") {
      return { ok: false, error: "invalid_backlink_url" };
    }
  } catch {
    return { ok: false, error: "invalid_backlink_url" };
  }

  const rate = parseProductRate({
    type: input.commissionType,
    value: input.commissionValue,
  });
  if (!rate.ok) return { ok: false, error: "invalid_rate" };
  const images = parseImageUrls(input.imageUrls ?? []);
  if (!images.ok) return { ok: false, error: "invalid_images" };

  return {
    ok: true,
    value: {
      brandId,
      sku,
      title,
      description: input.description?.trim() ?? "",
      priceGel,
      imageUrls: images.value,
      backlinkUrl: input.backlinkUrl,
      commissionType: input.commissionType,
      commissionValue: rate.value.storedValue,
    },
  };
}
