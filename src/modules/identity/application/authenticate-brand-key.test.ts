import { describe, expect, it } from "vitest";
import { mintApiKey } from "../domain/api-key";
import { authenticateBrandKey } from "./authenticate-brand-key";

const minted = mintApiKey({ bytes: (n) => new Uint8Array(n).fill(5) });

describe("authenticateBrandKey", () => {
  it("authenticates the minted key", async () => {
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => ({
          id: "b1",
          keyHash: minted.hash,
          status: "APPROVED",
          vatRegistered: true,
        }),
      },
    })(minted.plaintext);
    expect(result).toEqual({
      ok: true,
      value: { brandId: "b1", vatRegistered: true },
    });
  });
  it("rejects a right prefix with a wrong secret", async () => {
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => ({
          id: "b1",
          keyHash: minted.hash,
          status: "APPROVED",
          vatRegistered: true,
        }),
      },
    })(`${minted.prefix}_${"Z".repeat(32)}`);
    expect(result).toEqual({ ok: false, error: "unknown_key" });
  });
  it("rejects malformed input without querying", async () => {
    let queried = false;
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => {
          queried = true;
          return undefined;
        },
      },
    })("not-a-key");
    expect(result).toEqual({ ok: false, error: "unknown_key" });
    expect(queried).toBe(false);
  });
  it("rejects a suspended brand", async () => {
    const result = await authenticateBrandKey({
      brands: {
        findByKeyPrefix: async () => ({
          id: "b1",
          keyHash: minted.hash,
          status: "SUSPENDED",
          vatRegistered: false,
        }),
      },
    })(minted.plaintext);
    expect(result).toEqual({ ok: false, error: "brand_not_approved" });
  });
});
