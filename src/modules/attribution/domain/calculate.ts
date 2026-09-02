import { Money } from "@/src/modules/shared";
import { commissionableNet } from "./line-net";
import type {
  CalculatedLine,
  CalculationInput,
  CalculationResult,
} from "./types";

export function calculateAttributions(
  input: CalculationInput,
): CalculationResult {
  const eligibleLineIndexes: number[] = [];
  const lines: CalculatedLine[] = input.lineItems.map((item, index) => {
    const net = commissionableNet({
      unitPrice: item.unitPrice,
      qty: item.qty,
      lineDiscount: item.lineDiscount,
      lineVat: item.lineVat,
      brandVatRegistered: input.brandVatRegistered,
    });

    if (item.sku !== input.link.sku || net.isZero()) {
      return {
        sku: item.sku,
        commissionableNet: net.roundToTetri(),
        commission: Money.ZERO,
        attribution: undefined,
      };
    }

    const commission = input.link.rate
      .commissionFor(net, item.qty)
      .roundToTetri();
    eligibleLineIndexes.push(index);
    return {
      sku: item.sku,
      commissionableNet: net.roundToTetri(),
      commission,
      attribution: undefined,
    };
  });

  const firstEligibleIndex = eligibleLineIndexes[0];
  if (firstEligibleIndex === undefined) return { lines };

  const amount = eligibleLineIndexes.reduce(
    (total, index) => total.plus(lines[index]!.commission),
    Money.ZERO,
  );
  lines[firstEligibleIndex] = {
    ...lines[firstEligibleIndex]!,
    attribution: {
      creatorId: input.link.creatorId,
      clickId: input.link.clickId,
      productId: input.link.productId,
      amount,
    },
  };

  return { lines };
}
