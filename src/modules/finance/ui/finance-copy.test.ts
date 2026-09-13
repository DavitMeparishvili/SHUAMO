import { describe, expect, it } from "vitest";
import { financeDate, financeMoney } from "./finance-copy";

describe("portable finance formatting", () => {
  it("preserves exact large totals and localized credit amounts", () => {
    expect(financeMoney("123456789012345678.90", "en")).toBe(
      "123,456,789,012,345,678.90 GEL",
    );
    expect(financeMoney("-12345.67", "ka")).toBe("−12\u00a0345,67 ₾");
  });
  it("uses the Tbilisi calendar day and Georgian month across midnight", () => {
    expect(financeDate("2026-09-13T21:05:00Z", "ka", true)).toBe(
      "14 სექ. 2026, 01:05",
    );
    expect(financeDate("2026-09-13T21:05:00Z", "ka")).toBe("14 სექ. 2026");
  });
});
