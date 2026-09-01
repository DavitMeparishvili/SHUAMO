import { describe, expect, it } from "vitest";
import { decidePartnership } from "./decide-partnership";

describe("decidePartnership", () => {
  it("partnership approval authorizes links without creating them", async () => {
    let status: string | undefined;
    const result = await decidePartnership({ partnerships: {
      findForBrand: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "PENDING" }),
      setStatus: async (_id, value) => { status = value; },
    } })("b1", "pt1", "APPROVE");
    expect(result).toEqual({ ok: true, value: undefined });
    expect(status).toBe("APPROVED");
  });

  it("returns not found without writing", async () => {
    let touched = false;
    const result = await decidePartnership({ partnerships: {
      findForBrand: async () => undefined,
      setStatus: async () => { touched = true; },
    } })("b1", "missing", "REJECT");
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(touched).toBe(false);
  });
});
