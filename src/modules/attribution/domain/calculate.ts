import { Money } from "@/src/modules/shared";
import { commissionableNet } from "./line-net";
import type { CalculationInput, CalculationResult } from "./types";

export function calculateAttributions(
  input: CalculationInput,
): CalculationResult {
  return {
    lines: input.lineItems.map((item) => {
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
          commissionableNet: net,
          commission: Money.ZERO,
          attribution: undefined,
        };
      }

      const commission = input.link.rate
        .commissionFor(net, item.qty)
        .roundToTetri();
      return {
        sku: item.sku,
        commissionableNet: net,
        commission,
        attribution: {
          creatorId: input.link.creatorId,
          clickId: input.link.clickId,
          productId: input.link.productId,
          amount: commission,
        },
      };
    }),
  };
}
