import { describe, it, expect } from "vitest";
import { financeBalance } from "./balance";
import { paymentAmount, transferDate, tbilisiToday } from "./finance-input";
import { invoiceLines, invoicePreviewHash } from "./invoice-lines";
describe("manual finance arithmetic", () => {
  it("preserves credits and subtracts reversals exactly once", () => {
    expect(financeBalance("300", "400")).toEqual({
      earned: "300.00",
      payments: "400.00",
      outstanding: "-100.00",
    });
    expect(financeBalance("300", "200", "200").outstanding).toBe("300.00");
    expect(financeBalance("0.30", "0.10", "0.20").outstanding).toBe("0.40");
  });
  it.each([
    "0",
    "-1",
    "1e3",
    "0x10",
    "Infinity",
    "1.001",
    "10000000000",
    "",
    ".1",
  ])("rejects invalid amount %s", (value) =>
    expect(() => paymentAmount(value)).toThrow(),
  );
  it("accepts exact positive amounts without policy restrictions", () => {
    expect(paymentAmount(" 9999999999.99 ")).toBe("9999999999.99");
    expect(paymentAmount("0.1")).toBe("0.10");
  });
  it.each(["2026-02-29", "2026-09-31", "0000-01-01", "2026-1-01"])(
    "rejects invalid date %s",
    (value) => expect(() => transferDate(value)).toThrow(),
  );
  it("accepts future and leap dates; uses Tbilisi day", () => {
    expect(transferDate("2028-02-29")).toBe("2028-02-29");
    expect(tbilisiToday(new Date("2026-09-30T21:00:00Z"))).toBe("2026-10-01");
  });
  it("makes a cancellation correction once, keeping signed zero-total documents", () => {
    const c = {
      attributionId: "a",
      orderId: "o",
      description: "x",
      occurredOn: "2026-09-13",
      currentAmount: "0",
      invoicedAmount: "300",
    };
    expect(invoiceLines([c])[0]?.amount).toBe("-300.00");
    expect(invoiceLines([{ ...c, invoicedAmount: "0" }])).toEqual([]);
    expect(
      invoiceLines([
        c,
        { ...c, attributionId: "b", currentAmount: "300", invoicedAmount: "0" },
      ]),
    ).toHaveLength(2);
  });
  it("hashes normalized, sorted sources deterministically", () => {
    const c = {
        attributionId: "a",
        orderId: "o",
        description: "x",
        occurredOn: "2026-09-13",
        currentAmount: "300",
        invoicedAmount: "0",
      },
      party = { kind: "brand" as const, id: "b" };
    expect(invoicePreviewHash(party, [c])).toBe(
      invoicePreviewHash(party, [{ ...c, currentAmount: "300.00" }]),
    );
    expect(invoicePreviewHash(party, [c])).not.toBe(
      invoicePreviewHash({ kind: "creator", id: "b" }, [c]),
    );
  });
});
