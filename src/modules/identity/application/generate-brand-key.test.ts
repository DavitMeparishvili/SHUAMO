import { describe, expect, it } from "vitest";
import { generateBrandKey } from "./generate-brand-key";

describe("generateBrandKey", () => {
  it("returns plaintext but stores only prefix and hash", async () => {
    let stored: { keyPrefix: string; keyHash: string } | undefined;
    const result = await generateBrandKey({
      random: { bytes: (n) => new Uint8Array(n).fill(3) },
      brands: {
        findById: async () => ({ id: "b1" }),
        findByKeyPrefix: async () => undefined,
        updateKey: async (_id, key) => {
          stored = key;
        },
      },
    })("b1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stored?.keyPrefix).toBe(result.value.prefix);
    expect(stored?.keyHash).not.toContain(result.value.plaintext);
  });
  it("does not mint for a missing brand", async () => {
    let updated = false;
    const result = await generateBrandKey({
      random: { bytes: (n) => new Uint8Array(n) },
      brands: {
        findById: async () => undefined,
        findByKeyPrefix: async () => undefined,
        updateKey: async () => {
          updated = true;
        },
      },
    })("missing");
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(updated).toBe(false);
  });
});
