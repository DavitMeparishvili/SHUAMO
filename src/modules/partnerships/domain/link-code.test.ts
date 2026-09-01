import { describe, expect, it } from "vitest";
import { generateLinkCode, isLinkCode } from "./link-code";

describe("link codes", () => {
  it("generates eight Crockford base32 characters", () =>
    expect(
      generateLinkCode({ bytes: (n) => new Uint8Array(n).fill(9) }),
    ).toMatch(/^[0-9A-HJ-NP-TV-Z]{8}$/));
  it("excludes ambiguous letters", () =>
    expect(
      generateLinkCode({
        bytes: (n) => Uint8Array.from({ length: n }, (_, i) => i),
      }),
    ).not.toMatch(/[ILOU]/));
  it("validates the exact code shape", () => {
    expect(isLinkCode("K7M2QPXZ")).toBe(true);
    expect(isLinkCode("k7m2qpxz")).toBe(false);
    expect(isLinkCode("K7M2QPXI")).toBe(false);
  });
});
