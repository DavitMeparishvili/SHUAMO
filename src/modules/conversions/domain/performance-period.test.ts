import { describe, expect, it } from "vitest";
import {
  performancePeriod,
  performancePeriodStart,
  performanceTrendStart,
} from "./performance-period";

describe("performance periods", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("defaults unknown input to thirty days", () => {
    expect(performancePeriod(undefined)).toBe("30d");
    expect(performancePeriod("quarter")).toBe("30d");
  });

  it("resolves bounded periods without mutating now", () => {
    expect(performancePeriodStart("7d", now)?.toISOString()).toBe(
      "2026-08-26T20:00:00.000Z",
    );
    expect(now.toISOString()).toBe("2026-09-02T12:00:00.000Z");
  });

  it("keeps all-time totals while bounding its daily trend", () => {
    expect(performancePeriodStart("all", now)).toBeUndefined();
    expect(performanceTrendStart("all", now).toISOString()).toBe(
      "2026-06-04T20:00:00.000Z",
    );
  });

  it("uses a supplied custom start and caps a long custom trend", () => {
    const recent = new Date("2026-08-20T20:00:00.000Z");
    expect(performancePeriodStart("custom", now, recent)).toEqual(recent);
    expect(
      performanceTrendStart(
        "custom",
        now,
        new Date("2025-01-01T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-06-04T20:00:00.000Z");
  });
});
