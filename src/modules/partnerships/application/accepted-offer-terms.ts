import { z } from "zod";

const date = z.string().datetime().nullable();
const acceptedOfferTerms = z.object({
  version: z.number().int().positive(),
  cookieWindowDays: z.number().int().positive(),
  payoutTiming: z.enum(["AFTER_CONFIRMED_CONVERSION", "MONTHLY", "CUSTOM"]),
  allowedChannels: z.array(z.string()),
  prohibitedPromotionMethods: z.array(z.string()),
  availableRegions: z.array(z.string()),
  couponPolicy: z.string(),
  returnPolicy: z.string(),
  contentRequirements: z.string(),
  specialTerms: z.string(),
  offerStartsAt: date,
  offerEndsAt: date,
});

/** Legacy links have no snapshot; never label today's terms as their agreement. */
export function parseAcceptedOfferTerms(value: unknown) {
  const result = acceptedOfferTerms.safeParse(value);
  if (!result.success) return undefined;
  return {
    ...result.data,
    offerStartsAt: result.data.offerStartsAt
      ? new Date(result.data.offerStartsAt)
      : null,
    offerEndsAt: result.data.offerEndsAt
      ? new Date(result.data.offerEndsAt)
      : null,
  };
}
