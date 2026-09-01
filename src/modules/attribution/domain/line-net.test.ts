import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { commissionableNet } from "./line-net";

function net(overrides: Partial<Parameters<typeof commissionableNet>[0]> = {}) {
  return commissionableNet({
    unitPrice: Money.of("250.00"),
    qty: 1,
    lineDiscount: Money.of("25.00"),
    lineVat: undefined,
    brandVatRegistered: true,
    ...overrides,
  });
}

describe("commissionableNet", () => {
  it("derives 18% VAT from the discounted gross for a VAT-registered brand", () => {
    const exact = net();

    expect(exact.toString()).toBe("190.6779661016949152542372881");
    expect(exact.roundToTetri().toStorageString()).toBe("190.68");
  });

  it("uses supplied line VAT instead of deriving it", () => {
    expect(net({ lineVat: Money.of("34.32") }).toStorageString()).toBe(
      "190.68",
    );
  });

  it("multiplies unit price by quantity before discount and VAT", () => {
    expect(
      net({
        unitPrice: Money.of("50.00"),
        qty: 3,
        lineDiscount: Money.of("10.00"),
        lineVat: Money.of("20.00"),
      }).toStorageString(),
    ).toBe("120.00");
  });

  it("does not derive VAT for a non-VAT-registered brand", () => {
    expect(net({ brandVatRegistered: false }).toStorageString()).toBe("225.00");
  });

  it("clamps an excessive discount to zero", () => {
    expect(net({ lineDiscount: Money.of("251.00") }).toStorageString()).toBe(
      "0.00",
    );
  });

  it("returns zero when the discounted gross is exactly zero", () => {
    expect(net({ lineDiscount: Money.of("250.00") }).toStorageString()).toBe(
      "0.00",
    );
  });

  it("clamps supplied VAT greater than the discounted gross to zero", () => {
    expect(net({ lineVat: Money.of("226.00") }).toStorageString()).toBe("0.00");
  });
});
