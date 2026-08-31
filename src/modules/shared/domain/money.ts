import Decimal from "decimal.js";
import { assertFitsNumeric, parseDecimalText } from "./decimal-text";

// 28 significant digits: comfortably above numeric(12,2) with room for the
// unrounded intermediates in §6.3.
Decimal.set({ precision: 28, toExpNeg: -18, toExpPos: 21 });

const TETRI = 2;
const STORAGE_PRECISION = 12;

export class Money {
  static readonly ZERO = new Money(new Decimal(0));

  private constructor(private readonly value: Decimal) {}

  static of(value: string): Money {
    return new Money(parseDecimalText(value, "Money.of"));
  }

  plus(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  minus(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  /** Multiply by a whole count, such as a line quantity. */
  times(count: number): Money {
    if (!Number.isInteger(count)) {
      throw new TypeError("Money.times takes an integer count");
    }
    return new Money(this.value.times(count));
  }

  /** Multiply by a decimal fraction supplied as a string. Never rounds. */
  timesRateFraction(fraction: string): Money {
    return new Money(
      this.value.times(parseDecimalText(fraction, "Money.timesRateFraction")),
    );
  }

  dividedByInteger(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor === 0) {
      throw new RangeError("Money.dividedByInteger takes a non-zero integer");
    }
    return new Money(this.value.dividedBy(divisor));
  }

  roundToTetri(): Money {
    return new Money(this.value.toDecimalPlaces(TETRI, Decimal.ROUND_HALF_UP));
  }

  /**
   * Floors toward zero. §6.3 floors each share rather than rounding, because
   * rounding half-up makes the remainder negative for the 0.05-across-3 case
   * and pays the most recent clicker less than the others.
   */
  floorToTetri(): Money {
    return new Money(this.value.toDecimalPlaces(TETRI, Decimal.ROUND_DOWN));
  }

  negated(): Money {
    return new Money(this.value.negated());
  }

  compare(other: Money): -1 | 0 | 1 {
    return this.value.comparedTo(other.value) as -1 | 0 | 1;
  }

  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  /** The exact value, however many places it carries. */
  toString(): string {
    return this.value.toString();
  }

  /** The value as it goes into numeric(12,2). Throws if it would lose a digit. */
  toStorageString(): string {
    if (this.value.decimalPlaces() > TETRI) {
      throw new RangeError(
        `${this.value.toString()} is not exact at the tetri; round or floor it first`,
      );
    }
    assertFitsNumeric(this.value, STORAGE_PRECISION, TETRI, "Money");
    return this.value.toFixed(TETRI);
  }
}
