import { Money, type Result } from "@/src/modules/shared";
import { parseImageUrls } from "../domain/image-urls";
import { parseProductRate } from "../domain/product-rate";
import {
  AFFILIATE_CHANNELS,
  PAYOUT_TIMINGS,
  PROHIBITED_PROMOTION_METHODS,
  type AffiliatePayoutTimingValue,
} from "../domain/affiliate-terms";
import {
  isProductType,
  type ProductTypeValue,
} from "../domain/product-taxonomy";
import type { ProductWriteInput } from "../ports/product-repository";

export interface ProductInput {
  sku: string;
  title: string;
  description?: string | undefined;
  productType?: string | undefined;
  priceGel: string;
  imageUrls?: readonly string[] | undefined;
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays?: string | undefined;
  payoutTiming?: string | undefined;
  allowedChannels?: readonly string[] | undefined;
  prohibitedPromotionMethods?: readonly string[] | undefined;
  availableRegions?: readonly string[] | undefined;
  couponPolicy?: string | undefined;
  returnPolicy?: string | undefined;
  contentRequirements?: string | undefined;
  specialTerms?: string | undefined;
  offerStartsAt?: string | undefined;
  offerEndsAt?: string | undefined;
}

export type ProductInputError =
  | "invalid_sku"
  | "invalid_title"
  | "invalid_price"
  | "invalid_backlink_url"
  | "invalid_rate"
  | "invalid_images"
  | "invalid_product_type"
  | "invalid_affiliate_terms";

function parseDate(value: string | undefined): Date | null | undefined {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function acceptedValues(
  values: readonly string[],
  allowed: readonly string[],
): string[] | undefined {
  const unique = [...new Set(values)];
  return unique.every((value) => allowed.includes(value)) ? unique : undefined;
}

export function validateProductInput(
  brandId: string,
  input: ProductInput,
): Result<ProductWriteInput, ProductInputError> {
  const sku = input.sku.trim();
  const title = input.title.trim();
  if (sku.length === 0) return { ok: false, error: "invalid_sku" };
  if (title.length === 0) return { ok: false, error: "invalid_title" };
  const productType = input.productType ?? "OTHER";
  if (!isProductType(productType)) {
    return { ok: false, error: "invalid_product_type" };
  }

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

  const cookieWindowDays = Number(input.cookieWindowDays ?? "30");
  const payoutTiming = (input.payoutTiming ??
    "AFTER_CONFIRMED_CONVERSION") as AffiliatePayoutTimingValue;
  const allowedChannels = acceptedValues(
    input.allowedChannels ?? [],
    AFFILIATE_CHANNELS,
  );
  const prohibitedPromotionMethods = acceptedValues(
    input.prohibitedPromotionMethods ?? [],
    PROHIBITED_PROMOTION_METHODS,
  );
  const availableRegions = [
    ...new Set(
      (input.availableRegions ?? []).map((value) => value.toUpperCase()),
    ),
  ];
  const offerStartsAt = parseDate(input.offerStartsAt);
  const offerEndsAt = parseDate(input.offerEndsAt);
  const policyValues = [
    input.couponPolicy,
    input.returnPolicy,
    input.contentRequirements,
    input.specialTerms,
  ].map((value) => value?.trim() ?? "");
  if (
    !Number.isInteger(cookieWindowDays) ||
    cookieWindowDays < 1 ||
    cookieWindowDays > 3650 ||
    !PAYOUT_TIMINGS.includes(payoutTiming) ||
    allowedChannels === undefined ||
    prohibitedPromotionMethods === undefined ||
    availableRegions.some((value) => !/^[A-Z]{2}$/.test(value)) ||
    offerStartsAt === undefined ||
    offerEndsAt === undefined ||
    (offerStartsAt !== null &&
      offerEndsAt !== null &&
      offerEndsAt <= offerStartsAt) ||
    policyValues.some((value) => value.length > 2000)
  ) {
    return { ok: false, error: "invalid_affiliate_terms" };
  }

  return {
    ok: true,
    value: {
      brandId,
      sku,
      title,
      description: input.description?.trim() ?? "",
      productType: productType as ProductTypeValue,
      priceGel,
      imageUrls: images.value,
      backlinkUrl: input.backlinkUrl,
      commissionType: input.commissionType,
      commissionValue: rate.value.storedValue,
      cookieWindowDays,
      payoutTiming,
      allowedChannels,
      prohibitedPromotionMethods,
      availableRegions,
      couponPolicy: policyValues[0]!,
      returnPolicy: policyValues[1]!,
      contentRequirements: policyValues[2]!,
      specialTerms: policyValues[3]!,
      offerStartsAt,
      offerEndsAt,
    },
  };
}
