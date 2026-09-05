import { describe, expect, it } from "vitest";
import { parseAcceptedOfferTerms } from "./accepted-offer-terms";

describe("accepted offer terms", () => {
  it("does not mislabel missing, partial or invalid snapshots as accepted terms", () => {
    for (const value of [
      undefined,
      null,
      {},
      { version: 1 },
      "{}",
      { version: -1 },
    ]) {
      expect(parseAcceptedOfferTerms(value)).toBeUndefined();
    }
  });
  it("restores saved dates without substituting current conditions", () => {
    const snapshot = {
      version: 2,
      cookieWindowDays: 45,
      payoutTiming: "MONTHLY",
      allowedChannels: ["INSTAGRAM"],
      prohibitedPromotionMethods: [],
      availableRegions: ["GE"],
      couponPolicy: "Original",
      returnPolicy: "",
      contentRequirements: "",
      specialTerms: "",
      offerStartsAt: "2026-09-01T00:00:00.000Z",
      offerEndsAt: null,
    };
    expect(parseAcceptedOfferTerms(snapshot)).toMatchObject({
      ...snapshot,
      offerStartsAt: new Date(snapshot.offerStartsAt),
    });
    expect(
      parseAcceptedOfferTerms({ ...snapshot, offerStartsAt: "invalid" }),
    ).toBeUndefined();
  });
});
