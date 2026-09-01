import { createHash, createHmac } from "node:crypto";

/** Derive a daily salt without storing buyer data or maintaining salt rows. */
export function dailySalt(secret: string, at: Date): string {
  const utcDate = at.toISOString().slice(0, 10);
  return createHmac("sha256", secret).update(utcDate).digest("hex");
}

/** Hash separated fields so concatenation cannot make distinct inputs collide. */
export function computeFingerprint(input: {
  ip: string;
  userAgent: string;
  secret: string;
  at: Date;
}): string {
  return createHash("sha256")
    .update(input.ip)
    .update("\0")
    .update(input.userAgent)
    .update("\0")
    .update(dailySalt(input.secret, input.at))
    .digest("hex");
}
