import { describe, expect, it } from "vitest";
import { decidePartnership } from "./decide-partnership";

describe("decidePartnership", () => {
  it("mints one link per active product on approval", async () => {
    const created: unknown[] = [];
    const result = await decidePartnership({
      partnerships: {
        findForBrand: async () => ({
          id: "pt1",
          brandId: "b1",
          creatorId: "c1",
          status: "PENDING",
        }),
        setStatus: async () => undefined,
      },
      products: {
        listActiveForBrand: async () => [
          { id: "p1", status: "ACTIVE" },
          { id: "p2", status: "ACTIVE" },
        ],
      },
      links: {
        listForCreator: async () => [],
        createMany: async (pairs) => void created.push(...pairs),
      },
      random: { bytes: (n) => new Uint8Array(n).fill(2) },
    })("b1", "pt1", "APPROVE");
    expect(result).toEqual({ ok: true, value: { mintedLinks: 2 } });
    expect(created).toHaveLength(2);
  });
  it("mints nothing on rejection or re-approval", async () => {
    const created: unknown[] = [];
    const deps = {
      partnerships: {
        findForBrand: async () => ({
          id: "pt1",
          brandId: "b1",
          creatorId: "c1",
          status: "APPROVED" as const,
        }),
        setStatus: async () => undefined,
      },
      products: {
        listActiveForBrand: async () => [
          { id: "p1", status: "ACTIVE" as const },
        ],
      },
      links: {
        listForCreator: async () => [{ productId: "p1", creatorId: "c1" }],
        createMany: async (pairs: readonly unknown[]) =>
          void created.push(...pairs),
      },
      random: { bytes: (n: number) => new Uint8Array(n) },
    };
    expect(await decidePartnership(deps)("b1", "pt1", "REJECT")).toEqual({
      ok: true,
      value: { mintedLinks: 0 },
    });
    expect(await decidePartnership(deps)("b1", "pt1", "APPROVE")).toEqual({
      ok: true,
      value: { mintedLinks: 0 },
    });
    expect(created).toEqual([]);
  });
});
