import { describe, expect, it } from "vitest";
import { Money, Rate } from "@/src/modules/shared";
import { calculateAttributions } from "./calculate";
import type { CalculationInput, CitedLinkTerms, LineItemInput } from "./types";

const link: CitedLinkTerms = {
  clickId: "ck_1",
  brandId: "b1",
  creatorId: "c1",
  productId: "p1",
  sku: "A",
  rate: Rate.percent("0.12"),
};

function line(overrides: Partial<LineItemInput> = {}): LineItemInput {
  return {
    sku: "A",
    qty: 1,
    unitPrice: Money.of("100.00"),
    lineDiscount: Money.ZERO,
    lineVat: undefined,
    ...overrides,
  };
}

function input(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    link,
    lineItems: [line()],
    brandVatRegistered: false,
    ...overrides,
  };
}

describe("calculateAttributions", () => {
  it("ATTR-004 pays zero when the order contains only another product", () => {
    const result = calculateAttributions(
      input({ lineItems: [line({ sku: "B" })] }),
    );

    expect(result.lines[0]?.commission.toStorageString()).toBe("0.00");
    expect(result.lines[0]?.attribution).toBeUndefined();
  });

  it("ATTR-004 pays only matching lines in a mixed cart", () => {
    const result = calculateAttributions(
      input({ lineItems: [line({ sku: "A" }), line({ sku: "B" })] }),
    );

    expect(
      result.lines.map(({ commission }) => commission.toStorageString()),
    ).toEqual(["12.00", "0.00"]);
    expect(
      result.lines.map(({ attribution }) => attribution?.creatorId),
    ).toEqual(["c1", undefined]);
  });

  it("ATTR-005 assigns the full matching commission to the link creator", () => {
    const result = calculateAttributions(input());

    expect(result.lines[0]?.commission.toStorageString()).toBe("12.00");
    expect(result.lines[0]?.attribution).toMatchObject({
      creatorId: "c1",
      clickId: "ck_1",
      productId: "p1",
    });
    expect(result.lines[0]?.attribution?.amount.toStorageString()).toBe(
      "12.00",
    );
  });

  it("ATTR-005 creates at most one full attribution for each matching line", () => {
    const result = calculateAttributions(
      input({
        lineItems: [
          line({ unitPrice: Money.of("100.00") }),
          line({ unitPrice: Money.of("50.00") }),
        ],
      }),
    );

    expect(
      result.lines.map(({ commission }) => commission.toStorageString()),
    ).toEqual(["12.00", "6.00"]);
    expect(
      result.lines.map(({ attribution }) => attribution?.creatorId),
    ).toEqual(["c1", "c1"]);
  });

  it("ATTR-005 multiplies a fixed agreed rate by matching quantity", () => {
    const result = calculateAttributions(
      input({
        link: { ...link, rate: Rate.fixed("8.0000") },
        lineItems: [line({ qty: 3 })],
      }),
    );

    expect(result.lines[0]?.commission.toStorageString()).toBe("24.00");
    expect(result.lines[0]?.attribution?.amount.toStorageString()).toBe(
      "24.00",
    );
  });

  it("uses VAT-exclusive net for a matching percent commission", () => {
    const result = calculateAttributions(
      input({
        link: { ...link, rate: Rate.percent("0.10") },
        lineItems: [line({ unitPrice: Money.of("118.00") })],
        brandVatRegistered: true,
      }),
    );

    expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("100.00");
    expect(result.lines[0]?.commission.toStorageString()).toBe("10.00");
  });

  it("applies the percent rate to exact derived net before final commission rounding", () => {
    const result = calculateAttributions(
      input({
        link: { ...link, rate: Rate.percent("0.02") },
        lineItems: [line({ unitPrice: Money.of("100.00") })],
        brandVatRegistered: true,
      }),
    );

    expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("84.75");
    expect(result.lines[0]?.commission.toStorageString()).toBe("1.69");
  });

  it.each(["100.00", "101.00"])(
    "pays zero when the matching line discount %s leaves no positive net",
    (lineDiscount) => {
      const result = calculateAttributions(
        input({ lineItems: [line({ lineDiscount: Money.of(lineDiscount) })] }),
      );

      expect(result.lines[0]?.commissionableNet.toStorageString()).toBe("0.00");
      expect(result.lines[0]?.commission.toStorageString()).toBe("0.00");
      expect(result.lines[0]?.attribution).toBeUndefined();
    },
  );

  it("returns no calculated lines for an empty cart", () => {
    expect(calculateAttributions(input({ lineItems: [] })).lines).toEqual([]);
  });

  it("rounds the final commission half up to the exact tetri", () => {
    const result = calculateAttributions(
      input({
        link: { ...link, rate: Rate.percent("0.10") },
        lineItems: [line({ unitPrice: Money.of("10.05") })],
      }),
    );

    expect(result.lines[0]?.commission.toStorageString()).toBe("1.01");
  });
});
