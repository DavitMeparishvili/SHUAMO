import { describe, expect, it } from "vitest";
import { parseProductRate } from "./product-rate";

describe("parseProductRate", () => {
  it("accepts percent fractions and fixed GEL", () => {
    const percent = parseProductRate({ type: "PERCENT", value: "0.125" });
    expect(percent.ok && percent.value.storedValue).toBe("0.125");
    expect(parseProductRate({ type: "FIXED", value: "250.00" }).ok).toBe(true);
  });
  it("rejects the dangerous whole-percent typo", () =>
    expect(parseProductRate({ type: "PERCENT", value: "12.5" })).toEqual({
      ok: false,
      error: "percent_must_be_a_fraction",
    }));
  it("rejects negative and over-precise values", () => {
    expect(parseProductRate({ type: "FIXED", value: "-1" }).ok).toBe(false);
    expect(parseProductRate({ type: "PERCENT", value: "0.12345" })).toEqual({
      ok: false,
      error: "too_many_decimal_places",
    });
  });
});
