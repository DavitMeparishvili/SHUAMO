import { describe, expect, it } from "vitest";
import { applyToBrand, inviteCreator } from "./apply-to-brand";

describe("partnership creation", () => {
  it("creates creator applications as pending", async () => {
    let status: string | undefined;
    const result = await applyToBrand({
      brands: { findById: async () => ({ id: "b1" }) },
      partnerships: { find: async () => undefined, create: async (input) => { status = input.status; return { id: "pt1" }; } },
    })("c1", "b1");
    expect(result).toEqual({ ok: true, value: { partnershipId: "pt1" } });
    expect(status).toBe("PENDING");
  });

  it("brand invitation creates an approved partnership without links", async () => {
    const result = await inviteCreator({
      creators: { findById: async () => ({ id: "c1", status: "APPROVED" }) },
      partnerships: { find: async () => undefined, create: async () => ({ id: "pt1" }) },
    })("b1", "c1");
    expect(result).toEqual({ ok: true, value: { partnershipId: "pt1" } });
  });

  it("refuses a creator the administrator has not approved", async () => {
    const result = await inviteCreator({
      creators: { findById: async () => ({ id: "c1", status: "PENDING" }) },
      partnerships: { find: async () => undefined, create: async () => ({ id: "pt1" }) },
    })("b1", "c1");
    expect(result).toEqual({ ok: false, error: "creator_not_approved" });
  });
});
