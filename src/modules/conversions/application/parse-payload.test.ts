import { describe, expect, it } from "vitest";
import {
  parseConversionJson,
  parseConversionPayload,
} from "../application/parse-payload";
import { isTimestampAcceptable } from "../domain/payload";

const valid = {
  orderId: "1234",
  occurredAt: "2026-08-12T14:22:00+04:00",
  clickId: "ck_a91f",
  items: [
    {
      sku: "P-9",
      qty: 1,
      unitPrice: "250.00",
      lineDiscount: "25.00",
      lineVat: "34.32",
    },
  ],
};

describe("conversion payload", () => {
  it("accepts the API example and exact decimal strings", () => {
    const result = parseConversionPayload(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items[0]?.unitPrice.toStorageString()).toBe("250.00");
    expect(result.value.occurredAt.toISOString()).toBe(
      "2026-08-12T10:22:00.000Z",
    );
  });

  it("accepts JSON numeric money without binary-float arithmetic", () => {
    const result = parseConversionPayload({
      ...valid,
      items: [
        {
          sku: "P-9",
          qty: 1,
          unitPrice: 250.1,
          lineDiscount: 0,
          lineVat: 0,
        },
      ],
    });
    expect(
      result.ok && result.value.items[0]?.unitPrice.toStorageString(),
    ).toBe("250.10");
  });

  it("accepts absent clickId and lineVat", () => {
    const result = parseConversionPayload({
      orderId: "without-click",
      occurredAt: valid.occurredAt,
      items: [{ sku: "P-9", qty: 1, unitPrice: "1.00", lineDiscount: "0" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clickId).toBeUndefined();
    expect(result.value.items[0]?.lineVat).toBeUndefined();
  });

  it.each([
    [{ ...valid, orderId: "" }],
    [{ ...valid, items: [] }],
    [{ ...valid, occurredAt: "yesterday" }],
    [{ ...valid, items: [{ ...valid.items[0], qty: 0 }] }],
    [{ ...valid, items: [{ ...valid.items[0], qty: 1.5 }] }],
    [{ ...valid, items: [{ ...valid.items[0], unitPrice: "-1" }] }],
    [{ ...valid, items: [{ ...valid.items[0], lineDiscount: "1.001" }] }],
  ])("rejects invalid shape %#", (body) => {
    expect(parseConversionPayload(body).ok).toBe(false);
  });

  it("separates malformed JSON from invalid data", () => {
    expect(parseConversionJson("{bad")).toEqual({
      ok: false,
      error: { kind: "malformed" },
    });
    const invalid = parseConversionJson("{}");
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error.kind).toBe("invalid");
  });
});

describe("isTimestampAcceptable", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  const hours = (amount: number) =>
    new Date(now.getTime() + amount * 60 * 60 * 1000);

  it("accepts both exact 48-hour boundaries", () => {
    expect(isTimestampAcceptable(hours(-48), now)).toBe(true);
    expect(isTimestampAcceptable(hours(48), now)).toBe(true);
  });

  it("rejects either side beyond 48 hours", () => {
    expect(isTimestampAcceptable(hours(-49), now)).toBe(false);
    expect(isTimestampAcceptable(hours(49), now)).toBe(false);
  });
});
