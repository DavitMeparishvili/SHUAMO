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

  it("refuses a rate that numeric(9,4) would silently round", () => {
    // 0.1234567 stores as 0.1235. A commission recomputed from the stored rate
    // would then disagree with the one already written to the ledger.
    expect(Rate.percent("0.1234").storedValue).toBe("0.1234");
    expect(() => Rate.percent("0.1234567")).toThrowError(/numeric\(9,4\)/);
    expect(() => Rate.fixed("5.00001")).toThrowError(/numeric\(9,4\)/);
  });

  it("refuses more integer digits than numeric(9,4) holds", () => {
    expect(() => Rate.fixed("123456.00")).toThrowError(/numeric\(9,4\)/);
  });

  it("rejects every numeric notation that is not a plain decimal", () => {
    for (const notation of ["0x1F", "1e2", "1_000", "Infinity", ""]) {
      expect(() => Rate.fixed(notation), notation).toThrowError(/decimal/);
      expect(() => Rate.percent(notation), notation).toThrowError(/decimal/);
    }
  });
});
