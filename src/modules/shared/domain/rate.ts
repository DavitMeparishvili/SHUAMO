import { Money } from "./money";

export type RateKind = "PERCENT" | "FIXED";

export class Rate {
  private constructor(
    readonly kind: RateKind,
    private readonly value: string,
  ) {}

  /** A fraction: 0.125 is twelve and a half percent. Never 12.5. */
  static percent(fraction: string): Rate {
    const asMoney = Money.of(fraction);
    if (asMoney.isNegative()) {
      throw new RangeError("a commission rate may not be negative");
    }
    if (asMoney.compare(Money.of("1")) === 1) {
      throw new RangeError(
        `PERCENT is a fraction and may not exceed 1; received ${fraction}`,
      );
    }
    return new Rate("PERCENT", fraction);
  }

  /** An absolute GEL amount per unit. */
  static fixed(perUnit: string): Rate {
    if (Money.of(perUnit).isNegative()) {
      throw new RangeError("a commission rate may not be negative");
    }
    return new Rate("FIXED", perUnit);
  }

  get storedValue(): string {
    return this.value;
  }

  /** Unrounded. §6.3 rounds the result to the tetri, not this function. */
  commissionFor(net: Money, qty: number): Money {
    return this.kind === "PERCENT"
      ? net.timesRateFraction(this.value)
      : Money.of(this.value).times(qty);
  }
}
