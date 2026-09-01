import { createHash } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX_CHARS = 8;
const SECRET_CHARS = 32;
const PATTERN = /^xu_sk_([0-9A-HJ-NP-TV-Z]{8})_[0-9A-HJ-NP-TV-Z]{32}$/;

function encode(bytes: Uint8Array, length: number): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += ALPHABET[(bytes[index] ?? 0) % ALPHABET.length];
  }
  return output;
}

/**
 * SHA-256 is intentional: the token has 160 bits of uniform randomness, so a
 * slow password KDF adds latency without making exhaustive guessing viable.
 */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function mintApiKey(random: { bytes(count: number): Uint8Array }): {
  plaintext: string;
  prefix: string;
  hash: string;
} {
  const bytes = random.bytes(PREFIX_CHARS + SECRET_CHARS);
  const prefix = `xu_sk_${encode(bytes, PREFIX_CHARS)}`;
  const plaintext = `${prefix}_${encode(bytes.subarray(PREFIX_CHARS), SECRET_CHARS)}`;
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}

export function apiKeyPrefixOf(presented: string): string | undefined {
  const match = PATTERN.exec(presented);
  return match?.[1] === undefined ? undefined : `xu_sk_${match[1]}`;
}

/** Constant-time comparison after the public length check. */
export function keysMatch(presentedHash: string, storedHash: string): boolean {
  if (presentedHash.length !== storedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < presentedHash.length; index += 1) {
    difference |=
      presentedHash.charCodeAt(index) ^ storedHash.charCodeAt(index);
  }
  return difference === 0;
}
