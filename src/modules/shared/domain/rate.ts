import type Decimal from "decimal.js";
import { assertFitsNumeric, parseDecimalText } from "./decimal-text";
import { Money } from "./money";

export type RateKind = "PERCENT" | "FIXED";

// Rates are numeric(9,4): five integer digits, four decimal places. A rate that
// PostgreSQL would round on the way in is refused here, because a commission
// recomputed later from the stored rate would then disagree with the one
// already written to the ledger by a tetri.
const RATE_PRECISION = 9;
const RATE_SCALE = 4;

function validate(value: string, label: string): Decimal {
  const parsed = parseDecimalText(value, label);

  if (parsed.isNegative() && !parsed.isZero()) {
    throw new RangeError("a commission rate may not be negative");
  }

  if (parsed.decimalPlaces() > RATE_SCALE) {
    throw new RangeError(
      `${label}: ${value} does not fit numeric(${RATE_PRECISION},${RATE_SCALE}); a rate carries at most ${RATE_SCALE} decimal places`,
    );
  }

  assertFitsNumeric(parsed, RATE_PRECISION, RATE_SCALE, label);

  return parsed;
}

export class Rate {
  private constructor(
    readonly kind: RateKind,
    private readonly value: string,
  ) {}

  /** A fraction: 0.125 is twelve and a half percent. Never 12.5. */
  static percent(fraction: string): Rate {
    const parsed = validate(fraction, "Rate.percent");

    if (parsed.greaterThan(1)) {
      throw new RangeError(
        `PERCENT is a fraction and may not exceed 1; received ${fraction}`,
      );
    }

    return new Rate("PERCENT", fraction);
  }

  /** An absolute GEL amount per unit. */
  static fixed(perUnit: string): Rate {
    validate(perUnit, "Rate.fixed");
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
