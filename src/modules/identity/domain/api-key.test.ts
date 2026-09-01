import { describe, expect, it } from "vitest";
import { apiKeyPrefixOf, hashApiKey, keysMatch, mintApiKey } from "./api-key";

const fixedRandom = { bytes: (count: number) => new Uint8Array(count).fill(7) };

describe("brand API key", () => {
  it("mints a token in the xu_sk_ shape", () => {
    expect(mintApiKey(fixedRandom).plaintext).toMatch(
      /^xu_sk_[0-9A-HJ-NP-TV-Z]{8}_[0-9A-HJ-NP-TV-Z]{32}$/,
    );
  });
  it("returns a strict prefix and only a digest for storage", () => {
    const key = mintApiKey(fixedRandom);
    expect(key.plaintext.startsWith(key.prefix)).toBe(true);
    expect(key.hash).toBe(hashApiKey(key.plaintext));
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(key.hash).not.toContain(key.plaintext);
  });
  it("extracts only a valid token prefix", () => {
    const key = mintApiKey(fixedRandom);
    expect(apiKeyPrefixOf(key.plaintext)).toBe(key.prefix);
    expect(apiKeyPrefixOf("Bearer nonsense")).toBeUndefined();
  });
  it("compares equal-length digests in constant work", () => {
    const a = hashApiKey(`xu_sk_AAAAAAAA_${"B".repeat(32)}`);
    const b = hashApiKey(`xu_sk_AAAAAAAA_${"C".repeat(32)}`);
    expect(keysMatch(a, a)).toBe(true);
    expect(keysMatch(a, b)).toBe(false);
    expect(keysMatch("short", a)).toBe(false);
  });
  it("mints distinct real-random tokens", () => {
    const random = {
      bytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    };
    expect(mintApiKey(random).plaintext).not.toBe(mintApiKey(random).plaintext);
  });
});
