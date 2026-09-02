import { describe, expect, it } from "vitest";
import { Money } from "@/src/modules/shared";
import { canonicalRequestIdentity } from "./idempotency";
import type { ConversionPayload } from "./payload";

const presented: ConversionPayload = {
  orderId: "order-1",
  occurredAt: new Date("2026-08-12T10:00:00Z"),
  clickId: "ck_first",
  items: [
    {
      sku: "A",
      qty: 1,
      unitPrice: Money.of("118.00"),
      lineDiscount: Money.ZERO,
      lineVat: undefined,
    },
    {
      sku: "B",
      qty: 2,
      unitPrice: Money.of("25.00"),
      lineDiscount: Money.of("5.00"),
      lineVat: Money.ZERO,
    },
  ],
};

describe("canonicalRequestIdentity", () => {
  it("is stable across item order and decimal spelling", () => {
    expect(
      canonicalRequestIdentity({
        ...presented,
        items: [...presented.items].reverse(),
      }),
    ).toBe(canonicalRequestIdentity(presented));
  });

  it("includes the submitted click ID", () => {
    expect(
      canonicalRequestIdentity({ ...presented, clickId: "ck_different" }),
    ).not.toBe(canonicalRequestIdentity(presented));
  });

  it("distinguishes omitted VAT from explicitly submitted derived VAT", () => {
    expect(
      canonicalRequestIdentity({
        ...presented,
        items: [
          {
            ...presented.items[0]!,
            lineVat: Money.of("18.00"),
          },
          presented.items[1]!,
        ],
      }),
    ).not.toBe(canonicalRequestIdentity(presented));
  });

  it.each([
    { orderId: "changed" },
    { occurredAt: new Date("2026-08-12T11:00:00Z") },
    { items: [presented.items[0]!] },
    {
      items: [{ ...presented.items[0]!, qty: 2 }, presented.items[1]!],
    },
  ])("changes when submitted financial identity changes %#", (change) => {
    expect(canonicalRequestIdentity({ ...presented, ...change })).not.toBe(
      canonicalRequestIdentity(presented),
    );
  });
});
