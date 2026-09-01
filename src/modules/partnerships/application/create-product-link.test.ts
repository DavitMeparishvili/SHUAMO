import { describe, expect, it } from "vitest";
import { ActiveLinkExistsError } from "../ports/link-repository";
import { createProductLink } from "./create-product-link";

function deps(overrides: Record<string, unknown> = {}) {
  return {
    products: { findActiveOffer: async () => ({ id: "p1", brandId: "b1", commissionType: "PERCENT" as const, commissionValue: "0.1250" }) },
    partnerships: { find: async () => ({ id: "pt1", brandId: "b1", creatorId: "c1", status: "APPROVED" as const }) },
    links: {
      findActive: async () => undefined,
      create: async (input: { productId: string; creatorId: string; code: string; commissionType: "PERCENT" | "FIXED"; commissionValue: string }) => ({ id: "l1", ...input }),
    },
    random: { bytes: (count: number) => new Uint8Array(count).fill(1) },
    ...overrides,
  };
}

describe("createProductLink", () => {
  it("ATTR-002 and ATTR-006 create one product link with offered terms", async () => {
    const writes: unknown[] = [];
    const input = deps();
    input.links.create = async (write) => { writes.push(write); return { id: "l1", ...write }; };
    const result = await createProductLink(input)("c1", "p1");
    expect(result).toEqual({ ok: true, value: { linkId: "l1", code: expect.any(String), commissionType: "PERCENT", commissionValue: "0.1250" } });
    expect(writes).toEqual([expect.objectContaining({ productId: "p1", creatorId: "c1", commissionType: "PERCENT", commissionValue: "0.1250" })]);
  });

  it("rejects a missing or archived product", async () => {
    expect(await createProductLink(deps({ products: { findActiveOffer: async () => undefined } }))("c1", "p1")).toEqual({ ok: false, error: "product_not_found" });
  });

  it.each([undefined, { id: "pt1", brandId: "b1", creatorId: "c1", status: "PENDING" as const }, { id: "pt1", brandId: "b1", creatorId: "c1", status: "REJECTED" as const }])("rejects a non-approved partnership", async (partnership) => {
    expect(await createProductLink(deps({ partnerships: { find: async () => partnership } }))("c1", "p1")).toEqual({ ok: false, error: "partnership_not_approved" });
  });

  it("rejects an existing active link", async () => {
    expect(await createProductLink(deps({ links: { findActive: async () => ({ id: "old" }), create: async () => { throw new Error("unreachable"); } } }))("c1", "p1")).toEqual({ ok: false, error: "active_link_exists" });
  });

  it("maps a concurrent unique conflict", async () => {
    expect(await createProductLink(deps({ links: { findActive: async () => undefined, create: async () => { throw new ActiveLinkExistsError(); } } }))("c1", "p1")).toEqual({ ok: false, error: "active_link_exists" });
  });

  it("does not hide unrelated repository failures", async () => {
    await expect(createProductLink(deps({ links: { findActive: async () => undefined, create: async () => { throw new Error("database down"); } } }))("c1", "p1")).rejects.toThrow("database down");
  });
});
