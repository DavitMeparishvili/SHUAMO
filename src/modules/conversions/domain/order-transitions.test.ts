import { describe, expect, it } from "vitest";
import { nextStatus, type OrderAction } from "./order-transitions";

describe("order transitions", () => {
  it("allows only whole-order cancellation of a confirmed sale", () => {
    expect(nextStatus("CONFIRMED", "CANCEL")).toEqual({
      ok: true,
      value: "CANCELLED",
    });
    expect(nextStatus("CANCELLED", "CANCEL")).toEqual({
      ok: false,
      error: "illegal_transition",
    });
  });
  it("rejects legacy confirmation even from an untyped caller", () => {
    expect(nextStatus("CONFIRMED", "CONFIRM" as OrderAction)).toEqual({
      ok: false,
      error: "illegal_transition",
    });
  });
});
