export const PRODUCT_TYPES = [
  "BEAUTY_FRAGRANCE",
  "BEAUTY_SKINCARE",
  "BEAUTY_MAKEUP",
  "FASHION_CLOTHING",
  "FASHION_SHOES",
  "FASHION_ACCESSORIES",
  "HOME_DECOR",
  "HOME_FRAGRANCE",
  "FOOD_BEVERAGE",
  "ELECTRONICS",
  "HEALTH_WELLNESS",
  "SPORTS_OUTDOORS",
  "BABY_KIDS",
  "BOOKS_STATIONERY",
  "OTHER",
] as const;

export type ProductTypeValue = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_GROUPS = [
  {
    key: "beauty",
    values: ["BEAUTY_FRAGRANCE", "BEAUTY_SKINCARE", "BEAUTY_MAKEUP"],
  },
  {
    key: "fashion",
    values: ["FASHION_CLOTHING", "FASHION_SHOES", "FASHION_ACCESSORIES"],
  },
  { key: "home", values: ["HOME_DECOR", "HOME_FRAGRANCE"] },
  {
    key: "other",
    values: [
      "FOOD_BEVERAGE",
      "ELECTRONICS",
      "HEALTH_WELLNESS",
      "SPORTS_OUTDOORS",
      "BABY_KIDS",
      "BOOKS_STATIONERY",
      "OTHER",
    ],
  },
] as const satisfies readonly {
  key: string;
  values: readonly ProductTypeValue[];
}[];

export function isProductType(value: string): value is ProductTypeValue {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

export function productTypeMessageKey(value: ProductTypeValue): string {
  return `catalog.productType.${value}`;
}
