export type ProductStatusValue = "ACTIVE" | "ARCHIVED";

export interface ProductWriteInput {
  brandId: string;
  sku: string;
  title: string;
  description: string;
  priceGel: string;
  imageUrls: string[];
  backlinkUrl: string;
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
}

export interface ProductRecord extends ProductWriteInput {
  id: string;
  status: ProductStatusValue;
}

export interface ProductRepository {
  create(input: ProductWriteInput): Promise<ProductRecord>;
  update(
    id: string,
    input: Omit<ProductWriteInput, "brandId">,
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
