const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LINK_CODE_PATTERN = /^[0-9A-HJ-NP-TV-Z]{8}$/;

export interface LinkCodeRandomSource {
  bytes(count: number): Uint8Array;
}

export function generateLinkCode(random: LinkCodeRandomSource): string {
  const bytes = random.bytes(8);
  if (bytes.length !== 8) {
    throw new RangeError("random source must return exactly eight bytes");
  }
  return Array.from(
    bytes,
    (byte) => CROCKFORD_BASE32[byte & 31] as string,
  ).join("");
}

export function isLinkCode(value: string): boolean {
  return LINK_CODE_PATTERN.test(value);
}
