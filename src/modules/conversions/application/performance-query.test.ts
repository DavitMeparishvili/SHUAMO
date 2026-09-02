import { describe, expect, it } from "vitest";
import { parsePerformanceQuery } from "./performance-query";

const BRAND = "11111111-1111-4111-8111-111111111111";
const CREATOR = "22222222-2222-4222-8222-222222222222";

describe("parsePerformanceQuery", () => {
  it("uses creator-safe defaults and accepts creator filters", () => {
    expect(
      parsePerformanceQuery(
        { period: "90d", brand: BRAND, creator: CREATOR, view: "links" },
        "creator",
      ),
    ).toMatchObject({
      filters: { period: "90d", brandId: BRAND },
      metric: "clicks",
      breakdown: "links",
    });
  });

  it("uses brand-safe defaults and rejects foreign breakdowns", () => {
    expect(
      parsePerformanceQuery(
        { creator: CREATOR, view: "brands", status: "confirmed" },
        "brand",
      ),
    ).toMatchObject({
      filters: { period: "30d", creatorId: CREATOR, status: "CONFIRMED" },
      breakdown: "creators",
    });
  });

  it("bounds ledger search and ignores invalid identifiers", () => {
    const state = parsePerformanceQuery(
      { brand: "nope", q: `  ${"x".repeat(140)}  `, ledgerPage: "2" },
      "creator",
    );
    expect(state.filters.brandId).toBeUndefined();
    expect(state.filters.ledgerQuery).toHaveLength(120);
    expect(state.filters.ledgerPage).toBe(2);
  });

  it("accepts an ordered custom range and repairs an incomplete one", () => {
    expect(
      parsePerformanceQuery(
        { period: "custom", from: "2026-08-01", to: "2026-08-31" },
        "creator",
      ).filters,
    ).toMatchObject({
      period: "custom",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(
      parsePerformanceQuery({ period: "custom", from: "2026-08-01" }, "creator")
        .filters.period,
    ).toBe("30d");
  });

  it("ignores repeated scalar parameters and impossible calendar dates", () => {
    const state = parsePerformanceQuery(
      {
        status: ["CONFIRMED", "PENDING"],
        q: ["one", "two"],
        period: "custom",
        from: "2026-02-30",
        to: "2026-03-02",
      },
      "creator",
    );
    expect(state.filters).toEqual({ period: "30d" });
  });
});
