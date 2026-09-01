export interface TrackingRandomSource {
  bytes(count: number): Uint8Array;
}

function exactBytes(random: TrackingRandomSource, count: number): Uint8Array {
  const bytes = random.bytes(count);
  if (bytes.length !== count) {
    throw new RangeError(`random source must return exactly ${count} bytes`);
  }
  return bytes;
}

export function newClickId(random: TrackingRandomSource): string {
  return `ck_${Array.from(exactBytes(random, 6), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export function newVisitorId(random: TrackingRandomSource): string {
  const bytes = exactBytes(random, 16).slice();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const nodeCryptoRandom: TrackingRandomSource = {
  bytes: (count) => crypto.getRandomValues(new Uint8Array(count)),
};
