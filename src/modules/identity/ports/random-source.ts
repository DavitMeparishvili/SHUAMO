export interface RandomSource {
  bytes(count: number): Uint8Array;
}

export const webCryptoRandom: RandomSource = {
  bytes: (count) => crypto.getRandomValues(new Uint8Array(count)),
};
