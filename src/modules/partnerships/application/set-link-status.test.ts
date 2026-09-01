import { describe, expect, it } from "vitest";
import { setLinkStatus } from "./set-link-status";

describe("setLinkStatus", () => {
  it("changes only a link owned by the actor", async () => {
    const updates: string[] = [];
    const run = setLinkStatus({
      links: {
        findOwned: async () => ({ id: "l1" }),
        setStatus: async (id, status) => void updates.push(`${id}:${status}`),
      },
    });
    expect(await run({ kind: "creator", id: "c1" }, "l1", "DISABLED")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(updates).toEqual(["l1:DISABLED"]);
  });

  it("does not update a link outside the actor's scope", async () => {
    let updated = false;
    const run = setLinkStatus({
      links: {
        findOwned: async () => undefined,
        setStatus: async () => void (updated = true),
      },
    });

    expect(await run({ kind: "brand", id: "b2" }, "l1", "DISABLED")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(updated).toBe(false);
  });
});
