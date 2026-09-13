import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { serverEnv } from "@/src/config/env";

function signature(payload: string) {
  return createHmac("sha256", serverEnv().AUTH_SECRET)
    .update(`product-upload:${payload}`)
    .digest("hex");
}
/** Reserves only an upload namespace; never persists or publishes a product. */
export function createProductReservation(brandId: string) {
  const payload = `${brandId}:${randomUUID()}:${Date.now() + 7 * 86400000}`;
  return `${payload}:${signature(payload)}`;
}
export function verifyProductReservation(
  token: string,
  brandId: string,
): string | undefined {
  const [owner, id, expires, supplied, ...extra] = token.split(":");
  if (
    extra.length ||
    owner !== brandId ||
    !id ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    !expires ||
    Number(expires) < Date.now() ||
    !supplied ||
    !/^[a-f0-9]{64}$/.test(supplied)
  )
    return;
  const expected = signature(`${owner}:${id}:${expires}`);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
    ? id
    : undefined;
}
