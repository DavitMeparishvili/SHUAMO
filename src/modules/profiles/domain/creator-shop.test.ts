import { describe, expect, it } from "vitest";
import {
  SHOP_INITIAL_VISIBLE,
  isPubliclyShown,
  isSameIdSet,
  moveShopItem,
  shopAvailability,
} from "./creator-shop";

const base = {
  linkActive: true,
  productActive: true,
  offerStartsAt: null,
  offerEndsAt: null,
  imageCount: 1,
};
const now = new Date("2026-11-07T12:00:00Z");

describe("creator shop availability", () => {
  it("is available with an active link, active product, open window and a photo", () =>
    expect(shopAvailability(base, now)).toBe("available"));
  it("unavailable wins over every other reason", () =>
    expect(
      shopAvailability(
        {
          ...base,
          linkActive: false,
          imageCount: 0,
          offerEndsAt: new Date("2026-01-01"),
        },
        now,
      ),
    ).toBe("unavailable"));
  it("is unavailable when the product is not active", () =>
    expect(shopAvailability({ ...base, productActive: false }, now)).toBe(
      "unavailable",
    ));
  it("not-started when offerStartsAt is in the future", () =>
    expect(
      shopAvailability({ ...base, offerStartsAt: new Date("2026-12-01") }, now),
    ).toBe("not-started"));
  it("is available once offerStartsAt has passed", () =>
    expect(shopAvailability({ ...base, offerStartsAt: now }, now)).toBe(
      "available",
    ));
  it("ended when offerEndsAt <= now", () =>
    expect(shopAvailability({ ...base, offerEndsAt: now }, now)).toBe("ended"));
  it("no-photo when there are no images", () =>
    expect(shopAvailability({ ...base, imageCount: 0 }, now)).toBe("no-photo"));
  it("shows publicly only when visible and available", () => {
    expect(isPubliclyShown(true, "available")).toBe(true);
    expect(isPubliclyShown(false, "available")).toBe(false);
    expect(isPubliclyShown(true, "ended")).toBe(false);
  });
});

describe("creator shop ordering", () => {
  it.each([
    ["top", 2, ["c", "a", "b", "d"]],
    ["up", 2, ["a", "c", "b", "d"]],
    ["down", 1, ["a", "c", "b", "d"]],
    ["bottom", 0, ["b", "c", "d", "a"]],
    ["up", 0, ["a", "b", "c", "d"]],
    ["down", 3, ["a", "b", "c", "d"]],
    ["top", 9, ["a", "b", "c", "d"]],
  ] as const)("moveShopItem %s from %i", (move, index, expected) =>
    expect(moveShopItem(["a", "b", "c", "d"], index, move)).toEqual(expected),
  );
  it("returns a new array without mutating the input", () => {
    const items = ["a", "b"];
    const moved = moveShopItem(items, 0, "up");
    expect(moved).not.toBe(items);
    expect(items).toEqual(["a", "b"]);
  });
  it("isSameIdSet rejects missing, extra and duplicate ids", () => {
    expect(isSameIdSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(isSameIdSet(["a", "b"], ["a"])).toBe(false);
    expect(isSameIdSet(["a", "b"], ["a", "a"])).toBe(false);
    expect(isSameIdSet(["a", "b"], ["a", "c"])).toBe(false);
  });
  it("shows 12 items before Show more", () =>
    expect(SHOP_INITIAL_VISIBLE).toBe(12));
});
