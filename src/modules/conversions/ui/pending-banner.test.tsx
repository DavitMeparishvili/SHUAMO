import { describe, expect, it } from "vitest";
import { pendingEscalation } from "./pending-banner";

describe("pendingEscalation", () => {
  it.each([
    [0, "none"],
    [6, "none"],
    [7, "notice"],
    [13, "notice"],
    [14, "warning"],
    [29, "warning"],
    [30, "danger"],
    [90, "danger"],
  ] as const)("%s days old is %s", (days, expected) => {
    expect(pendingEscalation(days)).toBe(expected);
  });
});
