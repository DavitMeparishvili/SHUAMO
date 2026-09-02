import { describe, expect, it } from "vitest";
import { nextStatus } from "./order-transitions";

describe("nextStatus", () => {
  it.each([
    ["PENDING", "CONFIRM", "CONFIRMED"],
    ["PENDING", "CANCEL", "CANCELLED"],
    ["CONFIRMED", "CANCEL", "CANCELLED"],
  ] as const)("%s + %s -> %s", (from, action, to) => {
    expect(nextStatus(from, action)).toEqual({ ok: true, value: to });
  });

  it.each([
    ["CONFIRMED", "CONFIRM"],
    ["CANCELLED", "CONFIRM"],
    ["CANCELLED", "CANCEL"],
    ["UNATTRIBUTED", "CONFIRM"],
    ["UNATTRIBUTED", "CANCEL"],
  ] as const)("refuses %s + %s", (from, action) => {
    expect(nextStatus(from, action)).toEqual({
      ok: false,
      error: "illegal_transition",
    });
  });
});
