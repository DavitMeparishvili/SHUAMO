import { describe, expect, it, vi } from "vitest";
import { Money, Rate } from "@/src/modules/shared";
import { validateConversion } from "./validate-conversion";
import { requestFingerprint } from "./request-fingerprint";
import type { ConversionPayload } from "../domain/payload";

const now = new Date("2026-09-11T10:00:00Z");
const brand = { id: "brand", vatRegistered: false };
const payload: ConversionPayload = {
  orderId: "order",
  occurredAt: now,
  clickId: "click",
  items: [
    {
      sku: "SKU",
      qty: 2,
      unitPrice: Money.of("100"),
      lineDiscount: Money.ZERO,
      lineVat: undefined,
    },
  ],
};
function setup() {
  const deps = {
    clock: { now: () => now },
    clicks: {
      resolve: vi.fn(async () => ({
        clickId: "click",
        brandId: "brand",
        creatorId: "creator",
        productId: "product",
        sku: "SKU",
        rate: Rate.percent("0.10"),
      })),
    },
    conversions: {
      findByOrder: vi.fn(
        async (): Promise<
          | import("../ports/conversion-repository").ExistingConversion
          | undefined
        > => undefined,
      ),
    },
    isClickAttributed: vi.fn(async () => false),
  };
  return { deps, validate: validateConversion(deps) };
}
describe("read-only conversion validation", () => {
  it("calculates commission with read ports only", async () => {
    const { validate, deps } = setup();
    expect(await validate(brand, payload)).toEqual({
      mode: "validation",
      valid: true,
      outcome: "eligible",
      commissionAmount: "20.00",
    });
    expect(deps.clicks.resolve).toHaveBeenCalledWith("brand", "click", now);
  });
  it("uses the same VAT calculation as live attribution", async () => {
    const { validate } = setup();
    expect(
      await validate({ ...brand, vatRegistered: true }, payload),
    ).toMatchObject({ commissionAmount: "16.95" });
  });
  it("reports missing clicks without claiming attribution", async () => {
    const { validate, deps } = setup();
    expect(
      await validate(brand, { ...payload, clickId: undefined }),
    ).toMatchObject({
      valid: true,
      outcome: "no_click",
      commissionAmount: "0.00",
    });
    expect(deps.clicks.resolve).not.toHaveBeenCalled();
  });
  it("reports an unresolved click without exposing another brand", async () => {
    const { deps } = setup();
    const validate = validateConversion({
      ...deps,
      clicks: { resolve: async () => undefined },
    });
    expect(await validate(brand, payload)).toMatchObject({
      outcome: "invalid_click",
    });
    expect(deps.isClickAttributed).not.toHaveBeenCalled();
  });
  it("reports SKU mismatch before checking click consumption", async () => {
    const { validate, deps } = setup();
    expect(
      await validate(brand, {
        ...payload,
        items: [{ ...payload.items[0]!, sku: "OTHER" }],
      }),
    ).toMatchObject({ outcome: "sku_mismatch" });
    expect(deps.isClickAttributed).not.toHaveBeenCalled();
  });
  it("reports zero commissionable net", async () => {
    const { validate } = setup();
    expect(
      await validate(brand, {
        ...payload,
        items: [{ ...payload.items[0]!, unitPrice: Money.ZERO }],
      }),
    ).toMatchObject({ outcome: "zero_net" });
  });
  it("rejects an already consumed click", async () => {
    const { validate, deps } = setup();
    deps.isClickAttributed.mockResolvedValue(true);
    expect(await validate(brand, payload)).toMatchObject({
      valid: false,
      outcome: "click_already_attributed",
    });
  });
  it("rejects out-of-range new sale times", async () => {
    const { validate } = setup();
    expect(
      await validate(brand, { ...payload, occurredAt: new Date("2020-01-01") }),
    ).toMatchObject({ valid: false, outcome: "timestamp_out_of_range" });
  });
  it("recognizes identical cancelled replays without resurrecting them", async () => {
    const { validate, deps } = setup();
    const old = { ...payload, occurredAt: new Date("2020-01-01") };
    deps.conversions.findByOrder.mockResolvedValue({
      requestFingerprint: requestFingerprint(old),
      view: {
        id: "cv",
        orderId: "order",
        occurredAt: old.occurredAt.toISOString(),
        confirmedAt: old.occurredAt.toISOString(),
        status: "CANCELLED",
        commissionAmount: "20.00",
        items: [],
      },
    });
    expect(await validate(brand, old)).toMatchObject({
      valid: true,
      outcome: "replay",
      commissionAmount: "20.00",
    });
    expect(deps.clicks.resolve).not.toHaveBeenCalled();
    expect(await validate(brand, { ...old, clickId: "changed" })).toMatchObject(
      { valid: false, outcome: "order_conflict" },
    );
  });
});
