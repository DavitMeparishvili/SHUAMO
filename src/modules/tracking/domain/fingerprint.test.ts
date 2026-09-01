import { describe, expect, it } from "vitest";
import { computeFingerprint, dailySalt } from "./fingerprint";

const SECRET = "0".repeat(40);
const base = {
  ip: "31.146.0.1",
  userAgent: "Mozilla/5.0 (Linux)",
  secret: SECRET,
};

describe("computeFingerprint", () => {
  it("returns a hex digest without retaining either raw field", () => {
    const hash = computeFingerprint({
      ...base,
      at: new Date("2026-08-12T10:00:00Z"),
    });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("31.146");
    expect(hash.toLowerCase()).not.toContain("mozilla");
  });

  it("is stable within one UTC day and changes at midnight", () => {
    const morning = computeFingerprint({
      ...base,
      at: new Date("2026-08-12T00:00:01Z"),
    });
    const evening = computeFingerprint({
      ...base,
      at: new Date("2026-08-12T23:59:59Z"),
    });
    const nextDay = computeFingerprint({
      ...base,
      at: new Date("2026-08-13T00:00:00Z"),
    });
    expect(morning).toBe(evening);
    expect(nextDay).not.toBe(evening);
  });

  it.each([
    { ip: "31.146.0.2" },
    { userAgent: "curl/8" },
    { secret: "1".repeat(40) },
  ])("changes when any identifying input changes", (override) => {
    const at = new Date("2026-08-12T10:00:00Z");
    expect(computeFingerprint({ ...base, at, ...override })).not.toBe(
      computeFingerprint({ ...base, at }),
    );
  });

  it("separates fields before hashing", () => {
    const at = new Date("2026-08-12T10:00:00Z");
    expect(
      computeFingerprint({ ip: "ab", userAgent: "c", secret: SECRET, at }),
    ).not.toBe(
      computeFingerprint({ ip: "a", userAgent: "bc", secret: SECRET, at }),
    );
  });
});

describe("dailySalt", () => {
  it("depends on the UTC date rather than the timestamp spelling", () => {
    expect(dailySalt(SECRET, new Date("2026-08-13T01:00:00Z"))).toBe(
      dailySalt(SECRET, new Date("2026-08-12T21:00:00-04:00")),
    );
  });
});
