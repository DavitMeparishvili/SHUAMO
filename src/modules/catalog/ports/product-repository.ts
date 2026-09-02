export type ProductStatusValue = "ACTIVE" | "ARCHIVED";

export interface ProductWriteInput {
  brandId: string;
  sku: string;
  title: string;
  description: string;
  productType: import("../domain/product-taxonomy").ProductTypeValue;
  priceGel: string;
  imageUrls: string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays: number;
  payoutTiming: import("../domain/affiliate-terms").AffiliatePayoutTimingValue;
  allowedChannels: string[];
  prohibitedPromotionMethods: string[];
  availableRegions: string[];
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: Date | null;
  offerEndsAt: Date | null;
}

export interface ProductRecord extends ProductWriteInput {
  id: string;
  status: ProductStatusValue;
  termsVersion: number;
  termsUpdatedAt: Date;
}

export interface ProductRepository {
  findActiveOffer(productId: string): Promise<
    | {
        id: string;
        brandId: string;
        commissionType: "PERCENT" | "FIXED";
        commissionValue: string;
      }
    | undefined
  >;
  create(input: ProductWriteInput): Promise<ProductRecord>;
  update(
    id: string,
    input: Omit<ProductWriteInput, "brandId">,
    options?: { termsChanged: boolean },
  ): Promise<ProductRecord>;
  findBrandSku(
    brandId: string,
    sku: string,
  ): Promise<{ id: string } | undefined>;
  findOwned(
    brandId: string,
    productId: string,
  ): Promise<ProductRecord | undefined>;
  setStatus(productId: string, status: ProductStatusValue): Promise<void>;
  listActiveForBrand(
    brandId: string,
  ): Promise<{ id: string; status: ProductStatusValue }[]>;
}
