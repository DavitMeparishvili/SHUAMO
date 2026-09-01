import { Money } from "@/src/modules/shared";

export function commissionableNet(input: {
  unitPrice: Money;
  qty: number;
  lineDiscount: Money;
  lineVat: Money | undefined;
  brandVatRegistered: boolean;
}): Money {
  const grossAfterDiscount = input.unitPrice
    .times(input.qty)
    .minus(input.lineDiscount);
  if (grossAfterDiscount.isNegative() || grossAfterDiscount.isZero()) {
    return Money.ZERO;
  }

  const explicitOrDerivedVat =
    input.lineVat ??
    (input.brandVatRegistered
      ? grossAfterDiscount.minus(grossAfterDiscount.dividedByDecimal("1.18"))
      : Money.ZERO);
  const net = grossAfterDiscount.minus(explicitOrDerivedVat);
  return net.isNegative() ? Money.ZERO : net;
}
