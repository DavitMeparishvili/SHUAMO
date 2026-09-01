import { describe, expect, it } from "vitest";
import { Money, Rate } from "@/src/modules/shared";
import { calculateAttributions } from "./calculate";
import type { LineItemInput } from "./types";

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function moneyFromTetri(tetri: number): Money {
  return Money.of(
    `${Math.floor(tetri / 100)}.${String(tetri % 100).padStart(2, "0")}`,
  );
}

describe("single-link attribution properties", () => {
  it("ATTR-003 and ATTR-010 keep 5,000 seeded matching lines bound to only the cited creator", () => {
    const random = mulberry32(0x5a17c0de);
    const matchingLines = Array.from({ length: 5_000 }, (_, index) => {
      const unitTetri = 1 + Math.floor(random() * 100_000);
      const qty = 1 + Math.floor(random() * 12);
      const grossTetri = unitTetri * qty;
      const discountTetri =
        index % 17 === 0 ? grossTetri : Math.floor(random() * (grossTetri + 1));
      return {
        sku: "A",
        qty,
        unitPrice: moneyFromTetri(unitTetri),
        lineDiscount: moneyFromTetri(discountTetri),
        lineVat: undefined,
      } satisfies LineItemInput;
    });
    const lineItems = matchingLines.flatMap((item, index) =>
      index % 10 === 0 ? [item, { ...item, sku: "B" }] : [item],
    );
    const link = {
      clickId: "ck_seeded",
      brandId: "b1",
      creatorId: "cited-creator",
      productId: "p1",
      sku: "A",
      rate: Rate.percent("0.1375"),
    };

    const result = calculateAttributions({
      link,
      lineItems,
      brandVatRegistered: false,
    });

    expect(result.lines).toHaveLength(lineItems.length);
    for (const calculated of result.lines) {
      if (
        calculated.sku !== link.sku ||
        calculated.commissionableNet.isZero()
      ) {
        expect(calculated.attribution).toBeUndefined();
        expect(calculated.commission.toStorageString()).toBe("0.00");
      } else {
        expect(calculated.attribution?.creatorId).toBe(link.creatorId);
        expect(calculated.attribution?.clickId).toBe(link.clickId);
        expect(calculated.attribution?.amount.toStorageString()).toBe(
          calculated.commission.toStorageString(),
        );
      }
    }
  });
});
