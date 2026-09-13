import {
  AFFILIATE_CHANNELS,
  PAYOUT_TIMINGS,
  PROHIBITED_PROMOTION_METHODS,
} from "../domain/affiliate-terms";
import type { ProductTypeValue } from "../domain/product-taxonomy";
export interface ProductFormCopy {
  sku: string;
  title: string;
  description: string;
  sectionProduct: string;
  sectionProductIntro: string;
  sectionOffer: string;
  sectionTerms: string;
  sectionTermsIntro: string;
  productType: string;
  productTypes: Record<ProductTypeValue, string>;
  price: string;
  backlink: string;
  rateType: string;
  percent: string;
  fixed: string;
  commission: string;
  cookieWindow: string;
  days: string;
  payoutTiming: string;
  payoutTimings: Record<(typeof PAYOUT_TIMINGS)[number], string>;
  allowedChannels: string;
  channelLabels: Record<(typeof AFFILIATE_CHANNELS)[number], string>;
  prohibitedMethods: string;
  prohibitedLabels: Record<
    (typeof PROHIBITED_PROMOTION_METHODS)[number],
    string
  >;
  regions: string;
  regionsHint: string;
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: string;
  offerEndsAt: string;
  optional: string;
  storedFraction: string;
  estimateSale: string;
  estimateEarnings: string;
  addImage: string;
  primaryImage: string;
  moveEarlier: string;
  moveLater: string;
  removeImage: string;
  imageTypes: string;
  imageAfterPublishTitle: string;
  imageAfterPublishBody: string;
  uploadFailed: string;
  fileTooLarge: string;
  retry: string;
  uploading: string;
  publish: string;
  save: string;
  archive: string;
  warningTitle: string;
  warningBody: string;
}

export interface ProductFormValue {
  id?: string;
  sku: string;
  title: string;
  description: string;
  productType: ProductTypeValue;
  priceGel: string;
  imageUrls: readonly string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays: number;
  payoutTiming: (typeof PAYOUT_TIMINGS)[number];
  allowedChannels: readonly string[];
  prohibitedPromotionMethods: readonly string[];
  availableRegions: readonly string[];
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: Date | string | null;
  offerEndsAt: Date | string | null;
}
