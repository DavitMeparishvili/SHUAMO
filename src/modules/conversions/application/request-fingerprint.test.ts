import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { requestFingerprint } from "./request-fingerprint";

describe("requestFingerprint", () => {
  it("returns a stable lowercase SHA-256 fingerprint", () => {
    const payload = {
      orderId: "order-1",
      occurredAt: new Date("2026-09-02T08:00:00Z"),
      clickId: undefined,
      items: [
        {
          sku: "A",
          qty: 1,
          unitPrice: Money.of("100.00"),
          lineDiscount: Money.ZERO,
          lineVat: undefined,
        },
      ],
    };
    expect(requestFingerprint(payload)).toMatch(/^[0-9a-f]{64}$/);
    expect(requestFingerprint(payload)).toBe(requestFingerprint(payload));
  });
});
