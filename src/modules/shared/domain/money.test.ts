import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("parses and renders exactly two decimal places", () => {
    expect(Money.of("250").toStorageString()).toBe("250.00");
    expect(Money.of("250.5").toStorageString()).toBe("250.50");
    expect(Money.of("0").toStorageString()).toBe("0.00");
  });

  it("does not suffer binary floating point error", () => {
    expect(Money.of("0.1").plus(Money.of("0.2")).toStorageString()).toBe(
      "0.30",
    );
  });

  it("keeps full precision through an unrounded multiplication", () => {
    // 190.68 x 0.12 = 22.8816 — the intermediate must not be truncated
    // before §6.3 rounds it.
    expect(Money.of("190.68").timesRateFraction("0.12").toString()).toBe(
      "22.8816",
    );
  });

  it("rounds half up to the tetri", () => {
    expect(Money.of("22.885").roundToTetri().toStorageString()).toBe("22.89");
    expect(Money.of("22.884").roundToTetri().toStorageString()).toBe("22.88");
  });

  it("floors toward zero for share splitting", () => {
    // 22.88 / 2 = 11.44 exactly; 10.00 / 3 = 3.3333... floors to 3.33
    expect(
      Money.of("10.00").dividedByInteger(3).floorToTetri().toStorageString(),
    ).toBe("3.33");
  });

  it("refuses to store a value that is not exact at two decimal places", () => {
    expect(() => Money.of("22.8816").toStorageString()).toThrowError(/tetri/);
  });

  it("compares without coercing to a number", () => {
    expect(Money.of("11.44").compare(Money.of("11.45"))).toBe(-1);
    expect(Money.of("11.44").equals(Money.of("11.440"))).toBe(true);
  });

  it("carries a sign for reversals", () => {
    expect(Money.of("11.44").negated().toStorageString()).toBe("-11.44");
    expect(Money.of("-11.44").isNegative()).toBe(true);
  });

  it("rejects a JavaScript number at the constructor", () => {
    // @ts-expect-error a number must never reach Money
    expect(() => Money.of(250.5)).toThrowError(/string/);
  });

  it("rejects every numeric notation that is not a plain decimal", () => {
    // decimal.js accepts the whole JavaScript numeric-literal grammar, so a
    // malformed amount off a webhook or a CSV import would otherwise become a
    // plausible GEL figure instead of an error.
    for (const notation of ["0x1F", "0b1010", "0o17", "1_000", "1e2"]) {
      expect(() => Money.of(notation), notation).toThrowError(/decimal/);
    }
  });

  it("rejects blank, padded, and non-finite text", () => {
    for (const text of [
      "",
      " ",
      " 1.00",
      "1.00 ",
      "Infinity",
      "-Infinity",
      "NaN",
      ".5",
      "1.",
    ]) {
      expect(() => Money.of(text), JSON.stringify(text)).toThrowError(
        /decimal/,
      );
    }
  });

  it("guards the rate fraction exactly as it guards an amount", () => {
    // §Global Constraints: never a JavaScript number for money, at any layer.
    expect(() =>
      Money.of("1.00").timesRateFraction(0.1 as unknown as string),
    ).toThrowError(/string/);

    expect(() => Money.of("1.00").timesRateFraction("Infinity")).toThrowError(
      /decimal/,
    );
    expect(() => Money.of("1.00").timesRateFraction("0x10")).toThrowError(
      /decimal/,
    );
  });

  it("refuses to store more integer digits than numeric(12,2) holds", () => {
    // numeric(12,2) is ten integer digits. PostgreSQL rejects an overflow with
    // 22003 at insert time; the guard must fail here, where it claims to.
    expect(Money.of("9999999999.99").toStorageString()).toBe("9999999999.99");
    expect(() => Money.of("99999999999999.99").toStorageString()).toThrowError(
      /numeric\(12,2\)/,
    );
    expect(() => Money.of("10000000000").toStorageString()).toThrowError(
      /numeric\(12,2\)/,
    );
  });

  it("splits an unrounded commission into floored shares that reconstruct it", () => {
    // §6.3: each share is floored, and the remainder is what is left over. The
    // operands are deliberately unrounded — a commission carries four decimal
    // places before it is split, which is where a float implementation drifts.
    const commission = Money.of("190.68").timesRateFraction("0.12"); // 22.8816
    const share = commission.dividedByInteger(3).floorToTetri();

    expect(share.toStorageString()).toBe("7.62");
    expect(commission.minus(share.times(3)).toString()).toBe("0.0216");
  });

  it("holds the split invariant for random unrounded commissions", () => {
    for (let index = 0; index < 500; index += 1) {
      const integer = Math.floor(Math.random() * 100000);
      const tetri = String(Math.floor(Math.random() * 100)).padStart(2, "0");
      const net = Money.of(`${integer}.${tetri}`);
      const fraction = `0.${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
      const creators = 1 + Math.floor(Math.random() * 3);

      const commission = net.timesRateFraction(fraction);
      const share = commission.dividedByInteger(creators).floorToTetri();
      const distributed = share.times(creators);
      const remainder = commission.minus(distributed);

      // Nothing is created or destroyed by the split.
      expect(distributed.plus(remainder).equals(commission)).toBe(true);
      // Flooring never overpays, and never leaves a whole tetri per creator.
      expect(remainder.isNegative()).toBe(false);
      expect(remainder.compare(Money.of("0.01").times(creators))).toBe(-1);
    }
  });
});
