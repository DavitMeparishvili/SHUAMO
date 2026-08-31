import { describe, expect, it } from "vitest";
import { Money } from "./money";
import { Rate } from "./rate";

describe("Rate", () => {
  it("treats PERCENT as a fraction, never a whole number of percent", () => {
    expect(() => Rate.percent("12.5")).toThrowError(/fraction/);
    expect(Rate.percent("0.125").kind).toBe("PERCENT");
  });

  it("computes a percent commission from the net, unrounded", () => {
    expect(
      Rate.percent("0.12").commissionFor(Money.of("190.68"), 1).toString(),
    ).toBe("22.8816");
  });

  it("multiplies a FIXED rate by the quantity", () => {
    expect(
      Rate.fixed("5.00").commissionFor(Money.of("999.99"), 3).toStorageString(),
    ).toBe("15.00");
  });

  it("ignores the net entirely for a FIXED rate", () => {
    expect(
      Rate.fixed("5.00").commissionFor(Money.of("0.01"), 1).toStorageString(),
    ).toBe("5.00");
  });

  it("rejects a negative rate of either kind", () => {
    expect(() => Rate.percent("-0.1")).toThrowError(/negative/);
    expect(() => Rate.fixed("-1.00")).toThrowError(/negative/);
  });
});
