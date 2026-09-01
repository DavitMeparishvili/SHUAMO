import { describe, expect, it } from "vitest";
import { applyToBrand, inviteCreator } from "./apply-to-brand";

describe("partnership creation", () => {
  it("creates creator applications as pending", async () => {
    let status: string | undefined;
    const result = await applyToBrand({
      brands: { findById: async () => ({ id: "b1" }) },
      partnerships: {
        find: async () => undefined,
        create: async (input) => {
          status = input.status;
          return { id: "pt1" };
        },
      },
    })("c1", "b1");
    expect(result).toEqual({ ok: true, value: { partnershipId: "pt1" } });
    expect(status).toBe("PENDING");
  });
  it("invites only approved creators and mints immediately", async () => {
    const minted: unknown[] = [];
    const result = await inviteCreator({
      creators: { findById: async () => ({ id: "c1", status: "APPROVED" }) },
      partnerships: {
        find: async () => undefined,
        create: async () => ({ id: "pt1" }),
      },
      products: {
        listActiveForBrand: async () => [
          { id: "p1", status: "ACTIVE" },
          { id: "p2", status: "ACTIVE" },
        ],
      },
      links: {
        listForCreator: async () => [],
        createMany: async (pairs) => void minted.push(...pairs),
      },
      random: { bytes: (n) => new Uint8Array(n).fill(2) },
    })("b1", "c1");
    expect(result).toEqual({
      ok: true,
      value: { partnershipId: "pt1", mintedLinks: 2 },
    });
    expect(minted).toHaveLength(2);
  });
  it("refuses a creator the administrator has not approved", async () => {
    const result = await inviteCreator({
      creators: { findById: async () => ({ id: "c1", status: "PENDING" }) },
      partnerships: {
        find: async () => undefined,
        create: async () => ({ id: "pt1" }),
      },
      products: { listActiveForBrand: async () => [] },
      links: {
        listForCreator: async () => [],
        createMany: async () => undefined,
      },
      random: { bytes: (n) => new Uint8Array(n) },
    })("b1", "c1");
    expect(result).toEqual({ ok: false, error: "creator_not_approved" });
  });
});
