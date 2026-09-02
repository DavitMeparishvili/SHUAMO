import { calculateAttributions } from "@/src/modules/attribution";
import type { Clock } from "@/src/modules/shared";
import { effectiveLineValues } from "../domain/line-values";
import {
  isTimestampAcceptable,
  type ConversionPayload,
} from "../domain/payload";
import type { ClickResolver } from "../ports/click-resolver";
import type {
  ConversionRepository,
  ConversionView,
  PersistedLine,
} from "../ports/conversion-repository";
import { requestFingerprint } from "./request-fingerprint";

export type IntakeResult =
  | {
      readonly kind: "accepted" | "replay" | "unattributed";
      readonly conversion: ConversionView;
    }
  | { readonly kind: "order_conflict" }
  | { readonly kind: "click_conflict" }
  | { readonly kind: "timestamp_invalid" };

export function intakeConversion(dependencies: {
  readonly clock: Clock;
  readonly clicks: ClickResolver;
  readonly conversions: ConversionRepository;
}) {
  return async (
    brand: { readonly id: string; readonly vatRegistered: boolean },
    payload: ConversionPayload,
  ): Promise<IntakeResult> => {
    const fingerprint = requestFingerprint(payload);
    const existing = await dependencies.conversions.findByOrder(
      brand.id,
      payload.orderId,
    );
    if (existing !== undefined) {
      return existing.requestFingerprint === fingerprint
        ? { kind: "replay", conversion: existing.view }
        : { kind: "order_conflict" };
    }

    if (!isTimestampAcceptable(payload.occurredAt, dependencies.clock.now())) {
      return { kind: "timestamp_invalid" };
    }

    const link =
      payload.clickId === undefined
        ? undefined
        : await dependencies.clicks.resolve(
            brand.id,
            payload.clickId,
            payload.occurredAt,
          );

    const lines: PersistedLine[] =
      link === undefined
        ? payload.items.map((input) => ({
            input,
            ...effectiveLineValues(input, brand.vatRegistered),
            attribution: undefined,
          }))
        : calculateAttributions({
            link,
            lineItems: payload.items,
            brandVatRegistered: brand.vatRegistered,
          }).lines.map((calculated, index) => {
            const input = payload.items[index]!;
            const values = effectiveLineValues(input, brand.vatRegistered);
            return {
              input,
              ...values,
              commissionableNet: calculated.commissionableNet,
              attribution:
                calculated.attribution === undefined
                  ? undefined
                  : {
                      clickId: calculated.attribution.clickId,
                      creatorId: calculated.attribution.creatorId,
                      productId: calculated.attribution.productId,
                      commissionAmount: calculated.attribution.amount,
                    },
            };
          });

    const hasAttribution = lines.some((line) => line.attribution !== undefined);
    const status = hasAttribution ? "PENDING" : "UNATTRIBUTED";
    const created = await dependencies.conversions.create({
      brandId: brand.id,
      payload,
      requestFingerprint: fingerprint,
      status,
      lines,
    });

    if (created.kind === "existing") {
      return created.existing.requestFingerprint === fingerprint
        ? { kind: "replay", conversion: created.existing.view }
        : { kind: "order_conflict" };
    }
    if (created.kind === "click_conflict") return created;
    return {
      kind: status === "UNATTRIBUTED" ? "unattributed" : "accepted",
      conversion: created.view,
    };
  };
}
