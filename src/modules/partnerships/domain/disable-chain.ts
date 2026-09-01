export type DisableReason =
  "BRAND_DISABLED" | "CREATOR_REMOVED" | "PRODUCT_ARCHIVED" | "LINK_DISABLED";

export type LinkResolution =
  | { readonly active: true }
  | { readonly active: false; readonly reason: DisableReason };

export interface LinkState {
  readonly brandStatus: "PENDING" | "APPROVED" | "SUSPENDED";
  readonly partnershipStatus: "PENDING" | "APPROVED" | "REJECTED" | undefined;
  readonly productStatus: "ACTIVE" | "ARCHIVED";
  readonly linkStatus: "ACTIVE" | "DISABLED";
}

/** Resolve the four-row disable chain in the contractually significant order. */
export function resolveLink(state: LinkState): LinkResolution {
  if (state.brandStatus !== "APPROVED") {
    return { active: false, reason: "BRAND_DISABLED" };
  }
  if (state.partnershipStatus !== "APPROVED") {
    return { active: false, reason: "CREATOR_REMOVED" };
  }
  if (state.productStatus === "ARCHIVED") {
    return { active: false, reason: "PRODUCT_ARCHIVED" };
  }
  if (state.linkStatus === "DISABLED") {
    return { active: false, reason: "LINK_DISABLED" };
  }
  return { active: true };
}
