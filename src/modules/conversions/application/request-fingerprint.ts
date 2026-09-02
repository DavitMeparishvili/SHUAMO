import { createHash } from "node:crypto";
import { canonicalRequestIdentity } from "../domain/idempotency";
import type { ConversionPayload } from "../domain/payload";

export function requestFingerprint(payload: ConversionPayload): string {
  return createHash("sha256")
    .update(canonicalRequestIdentity(payload), "utf8")
    .digest("hex");
}
