import { describe, expect, it } from "vitest";
import { safeProfileReturnTo } from "./profile-return-to";

describe("safeProfileReturnTo", () => {
  it("accepts only a public profile in the current locale", () => {
    expect(safeProfileReturnTo("en", "/en/creators/nino")).toBe(
      "/en/creators/nino",
    );
    expect(safeProfileReturnTo("en", "/ka/creators/nino")).toBeUndefined();
    expect(safeProfileReturnTo("en", "https://evil.example")).toBeUndefined();
    expect(
      safeProfileReturnTo("en", "//evil.example/en/brands/a"),
    ).toBeUndefined();
    expect(safeProfileReturnTo("en", "/en/workspace")).toBeUndefined();
  });
});
