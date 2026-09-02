export const AFFILIATE_CHANNELS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "BLOG",
  "EMAIL",
  "PODCAST",
  "OTHER",
] as const;

export const PROHIBITED_PROMOTION_METHODS = [
  "PAID_SEARCH",
  "PAID_SOCIAL",
  "COUPON_SITES",
  "EMAIL_SPAM",
  "SELF_REFERRALS",
  "TRADEMARK_BIDDING",
] as const;

export const PAYOUT_TIMINGS = [
  "AFTER_CONFIRMED_CONVERSION",
  "MONTHLY",
  "CUSTOM",
] as const;

export type AffiliateChannel = (typeof AFFILIATE_CHANNELS)[number];
export type ProhibitedPromotionMethod =
  (typeof PROHIBITED_PROMOTION_METHODS)[number];
export type AffiliatePayoutTimingValue = (typeof PAYOUT_TIMINGS)[number];

interface AffiliateTermsComparable {
  commissionType: "PERCENT" | "FIXED";
  commissionValue: string;
  cookieWindowDays: number;
  payoutTiming: AffiliatePayoutTimingValue;
  allowedChannels: readonly string[];
  prohibitedPromotionMethods: readonly string[];
  availableRegions: readonly string[];
  couponPolicy: string;
  returnPolicy: string;
  contentRequirements: string;
  specialTerms: string;
  offerStartsAt: Date | null;
  offerEndsAt: Date | null;
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

export function affiliateTermsChanged(
  current: AffiliateTermsComparable,
  next: AffiliateTermsComparable,
): boolean {
  return (
    current.commissionType !== next.commissionType ||
    current.commissionValue !== next.commissionValue ||
    current.cookieWindowDays !== next.cookieWindowDays ||
    current.payoutTiming !== next.payoutTiming ||
    !sameValues(current.allowedChannels, next.allowedChannels) ||
    !sameValues(
      current.prohibitedPromotionMethods,
      next.prohibitedPromotionMethods,
    ) ||
    !sameValues(current.availableRegions, next.availableRegions) ||
    current.couponPolicy !== next.couponPolicy ||
    current.returnPolicy !== next.returnPolicy ||
    current.contentRequirements !== next.contentRequirements ||
    current.specialTerms !== next.specialTerms ||
    current.offerStartsAt?.getTime() !== next.offerStartsAt?.getTime() ||
    current.offerEndsAt?.getTime() !== next.offerEndsAt?.getTime()
  );
}
