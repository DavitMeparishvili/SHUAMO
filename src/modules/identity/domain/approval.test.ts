import { describe, expect, it } from "vitest";
import { APPROVAL_STATUSES, isActive } from "./approval";

describe("isActive", () => {
  it.each(APPROVAL_STATUSES)("gates %s correctly", (status) => {
    expect(isActive(status)).toBe(status === "APPROVED");
  });
});
