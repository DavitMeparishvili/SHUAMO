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

  it("is associative over addition for random tetri amounts", () => {
    for (let i = 0; i < 500; i += 1) {
      const pick = () =>
        Money.of(
          `${Math.floor(Math.random() * 100000)}.${String(
            Math.floor(Math.random() * 100),
          ).padStart(2, "0")}`,
        );
      const [a, b, c] = [pick(), pick(), pick()];

      expect(a.plus(b).plus(c).toStorageString()).toBe(
        a.plus(b.plus(c)).toStorageString(),
      );
    }
  });
});
