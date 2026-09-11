import { calculateAttributions } from "@/src/modules/attribution";
import { Money, type Clock } from "@/src/modules/shared";
import {
  isTimestampAcceptable,
  type ConversionPayload,
} from "../domain/payload";
import type { ClickResolver } from "../ports/click-resolver";
import type { ConversionRepository } from "../ports/conversion-repository";
import { requestFingerprint } from "./request-fingerprint";

export type ValidationResult = {
  mode: "validation";
  valid: boolean;
  outcome:
    | "eligible"
    | "no_click"
    | "invalid_click"
    | "sku_mismatch"
    | "zero_net"
    | "replay"
    | "order_conflict"
    | "click_already_attributed"
    | "timestamp_out_of_range";
  commissionAmount: string;
};

// Deliberately accepts only read ports: validation cannot create a sale,
// consume a click, change commission records, or reserve an order ID.
export function validateConversion(deps: {
  clock: Clock;
  clicks: ClickResolver;
  conversions: Pick<ConversionRepository, "findByOrder">;
  isClickAttributed: (clickId: string) => Promise<boolean>;
}) {
  return async (
    brand: { id: string; vatRegistered: boolean },
    payload: ConversionPayload,
  ): Promise<ValidationResult> => {
    const result = (
      outcome: ValidationResult["outcome"],
      valid = true,
      commissionAmount = "0.00",
    ): ValidationResult => ({
      mode: "validation",
      valid,
      outcome,
      commissionAmount,
    });
    const existing = await deps.conversions.findByOrder(
      brand.id,
      payload.orderId,
    );
    if (existing)
      return existing.requestFingerprint === requestFingerprint(payload)
        ? result("replay", true, existing.view.commissionAmount)
        : result("order_conflict", false);
    if (!isTimestampAcceptable(payload.occurredAt, deps.clock.now()))
      return result("timestamp_out_of_range", false);
    if (!payload.clickId) return result("no_click");
    const link = await deps.clicks.resolve(
      brand.id,
      payload.clickId,
      payload.occurredAt,
    );
    if (!link) return result("invalid_click");
    if (!payload.items.some((item) => item.sku === link.sku))
      return result("sku_mismatch");
    const { lines } = calculateAttributions({
      link,
      lineItems: payload.items,
      brandVatRegistered: brand.vatRegistered,
    });
    if (!lines.some((line) => line.attribution !== undefined))
      return result("zero_net");
    if (await deps.isClickAttributed(payload.clickId))
      return result("click_already_attributed", false);
    const total = lines.reduce(
      (sum, line) => sum.plus(line.attribution?.amount ?? Money.ZERO),
      Money.ZERO,
    );
    return result("eligible", true, total.toStorageString());
  };
}
