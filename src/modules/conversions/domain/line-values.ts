import { Money } from "@/src/modules/shared";
import type { ConversionLineInput } from "./payload";

export function effectiveLineValues(
  item: ConversionLineInput,
  brandVatRegistered: boolean,
): { readonly lineVat: Money; readonly commissionableNet: Money } {
  const gross = item.unitPrice.times(item.qty).minus(item.lineDiscount);
  if (gross.isNegative() || gross.isZero()) {
    return {
      lineVat: item.lineVat?.roundToTetri() ?? Money.ZERO,
      commissionableNet: Money.ZERO,
    };
  }
  const lineVat =
    item.lineVat ??
    (brandVatRegistered
      ? gross.minus(gross.dividedByDecimal("1.18"))
      : Money.ZERO);
  const net = gross.minus(lineVat);
  return {
    lineVat: lineVat.roundToTetri(),
    commissionableNet: net.isNegative() ? Money.ZERO : net.roundToTetri(),
  };
}
