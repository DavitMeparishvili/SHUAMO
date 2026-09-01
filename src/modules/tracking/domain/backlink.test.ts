import { describe, expect, it } from "vitest";
import { appendClickId } from "./backlink";

describe("appendClickId", () => {
  it.each([
    ["https://shop.ge/p/1", "https://shop.ge/p/1?xu=ck_a91f"],
    [
      "https://shop.ge/p/1?color=red",
      "https://shop.ge/p/1?color=red&xu=ck_a91f",
    ],
    ["https://shop.ge/p/1#reviews", "https://shop.ge/p/1?xu=ck_a91f#reviews"],
    [
      "https://shop.ge/p/1?color=red#reviews",
      "https://shop.ge/p/1?color=red&xu=ck_a91f#reviews",
    ],
    ["https://shop.ge/p/1?xu=stale", "https://shop.ge/p/1?xu=ck_a91f"],
  ])("preserves the destination shape for %s", (input, expected) => {
    expect(appendClickId(input, "ck_a91f")).toBe(expected);
  });

  it("preserves encoded paths and trailing slashes", () => {
    expect(appendClickId("https://shop.ge/კატეგორია/1/", "ck_a91f")).toContain(
      "/1/?xu=ck_a91f",
    );
  });

  it("rejects relative and non-http destinations", () => {
    expect(() => appendClickId("/relative", "ck_a91f")).toThrow();
    expect(() => appendClickId("javascript:alert(1)", "ck_a91f")).toThrow();
  });
});
