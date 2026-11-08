import { describe, expect, it } from "vitest";
import {
  shopProductIdSchema,
  shopProductIdsSchema,
} from "./creator-shop-input";

const uuid1 = "6f1c2a4e-7b1d-4c3e-9a2f-0e5d8b7c6a11";
const uuid2 = "0b9e8d7c-6a5f-4e3d-8c2b-1a0f9e8d7c22";

describe("creator shop input", () => {
  it("accepts a list of distinct product uuids", () =>
    expect(shopProductIdsSchema.safeParse([uuid1, uuid2]).success).toBe(true));
  it("rejects empty, malformed, duplicate and oversized lists", () => {
    expect(shopProductIdsSchema.safeParse([]).success).toBe(false);
    expect(shopProductIdsSchema.safeParse(["x"]).success).toBe(false);
    expect(shopProductIdsSchema.safeParse([uuid1, uuid1]).success).toBe(false);
    expect(
      shopProductIdsSchema.safeParse(
        Array.from({ length: 201 }, () => crypto.randomUUID()),
      ).success,
    ).toBe(false);
  });
  it("accepts 200 distinct uuids", () =>
    expect(
      shopProductIdsSchema.safeParse(
        Array.from({ length: 200 }, () => crypto.randomUUID()),
      ).success,
    ).toBe(true));
  it("accepts a single uuid and rejects path-like ids", () => {
    expect(shopProductIdSchema.safeParse(uuid1).success).toBe(true);
    expect(shopProductIdSchema.safeParse("../x").success).toBe(false);
  });
});
