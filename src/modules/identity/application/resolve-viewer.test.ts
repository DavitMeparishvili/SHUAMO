import { describe, expect, it } from "vitest";
import { resolveViewer } from "./resolve-viewer";

const accounts = (record: unknown) => ({
  findByUserId: async () => record as never,
});

describe("resolveViewer", () => {
  it("resolves an absent session or account to anonymous", async () => {
    expect(
      await resolveViewer({ accounts: accounts(undefined) })(undefined),
    ).toEqual({ kind: "anonymous" });
    expect(
      await resolveViewer({ accounts: accounts(undefined) })("ghost"),
    ).toEqual({ kind: "anonymous" });
  });
  it("resolves an approved brand", async () => {
    const viewer = await resolveViewer({
      accounts: accounts({
        userId: "u1",
        isAdmin: false,
        brand: { id: "b1", name: "Aromashop", status: "APPROVED" },
      }),
    })("u1");
    expect(viewer).toEqual({
      kind: "brand",
      userId: "u1",
      brandId: "b1",
      brandName: "Aromashop",
      isAdmin: false,
    });
  });
  it.each(["PENDING", "SUSPENDED"] as const)(
    "resolves a %s role to anonymous",
    async (status) => {
      const viewer = await resolveViewer({
        accounts: accounts({
          userId: "u2",
          isAdmin: false,
          creator: { id: "c2", displayName: "Nino", status },
        }),
      })("u2");
      expect(viewer).toEqual({ kind: "anonymous" });
    },
  );
  it("resolves an approved creator and an admin", async () => {
    expect(
      await resolveViewer({
        accounts: accounts({
          userId: "u3",
          isAdmin: false,
          creator: { id: "c3", displayName: "Nino", status: "APPROVED" },
        }),
      })("u3"),
    ).toEqual({
      kind: "creator",
      userId: "u3",
      creatorId: "c3",
      displayName: "Nino",
      isAdmin: false,
    });
    expect(
      await resolveViewer({
        accounts: accounts({ userId: "u4", isAdmin: true }),
      })("u4"),
    ).toEqual({ kind: "admin", userId: "u4" });
  });
});
