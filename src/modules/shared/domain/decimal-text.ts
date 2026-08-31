import Decimal from "decimal.js";

/**
 * A plain decimal string and nothing else: optional sign, at least one integer
 * digit, an optional fractional part.
 *
 * `new Decimal(...)` accepts the whole JavaScript numeric-literal grammar —
 * `0x1F`, `0b1010`, `0o17`, `1_000`, `1e2`, `Infinity`. Every one of those
 * parses to a finite, plausible-looking amount, so a malformed figure arriving
 * from a webhook, a CSV import, or an admin form would become money rather than
 * an error. Money and Rate both come through here.
 */
const DECIMAL_TEXT = /^[+-]?\d+(?:\.\d+)?$/;

export function parseDecimalText(value: string, label: string): Decimal {
  if (typeof value !== "string") {
    throw new TypeError(
      `${label} takes a string; a number cannot hold GEL exactly`,
    );
  }

  if (!DECIMAL_TEXT.test(value)) {
    throw new RangeError(
      `${label} takes a plain decimal string such as "250.00"; received ${JSON.stringify(value)}`,
    );
  }

  return new Decimal(value);
}

/** Digits to the left of the point, ignoring sign. `0.5` has one. */
export function integerDigitsOf(value: Decimal): number {
  const digits = value.abs().trunc().toFixed();
  return digits === "0" ? 1 : digits.length;
}

/**
 * PostgreSQL rejects an out-of-range numeric with 22003 at insert time. A
 * value that cannot be stored should fail where it is built, not three layers
 * later inside a transaction.
 */
export function assertFitsNumeric(
  value: Decimal,
  precision: number,
  scale: number,
  label: string,
): void {
  if (integerDigitsOf(value) > precision - scale) {
    throw new RangeError(
      `${label}: ${value.toString()} does not fit numeric(${precision},${scale})`,
    );
  }
}
