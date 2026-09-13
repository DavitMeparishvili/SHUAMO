function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

export function productFormInput(formData: FormData) {
  const regions = value(formData, "availableRegions")
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);
  return {
    sku: value(formData, "sku"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    productType: value(formData, "productType"),
    priceGel: value(formData, "priceGel"),
    imageUrls: formData
      .getAll("imageUrls")
      .filter((item): item is string => typeof item === "string"),
    backlinkUrl: value(formData, "backlinkUrl"),
    commissionType:
      value(formData, "commissionType") === "FIXED"
        ? ("FIXED" as const)
        : ("PERCENT" as const),
    commissionValue: value(formData, "commissionValue"),
    cookieWindowDays: value(formData, "cookieWindowDays"),
    payoutTiming: value(formData, "payoutTiming"),
    allowedChannels: formData
      .getAll("allowedChannels")
      .filter((item): item is string => typeof item === "string"),
    prohibitedPromotionMethods: formData
      .getAll("prohibitedPromotionMethods")
      .filter((item): item is string => typeof item === "string"),
    availableRegions: regions,
    couponPolicy: value(formData, "couponPolicy"),
    returnPolicy: value(formData, "returnPolicy"),
    contentRequirements: value(formData, "contentRequirements"),
    specialTerms: value(formData, "specialTerms"),
    offerStartsAt: value(formData, "offerStartsAt"),
    offerEndsAt: value(formData, "offerEndsAt"),
  };
}
