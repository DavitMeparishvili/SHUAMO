import { z } from "zod";
import { err, Money, ok, type Result } from "@/src/modules/shared";
import type { ConversionPayload } from "../domain/payload";

export type PayloadError =
  | { readonly kind: "malformed" }
  | { readonly kind: "invalid"; readonly issues: readonly string[] };

const moneySchema = z
  .union([z.string(), z.number().finite()])
  .transform((value, context) => {
    try {
      const money = Money.of(String(value));
      money.toStorageString();
      if (money.isNegative()) throw new RangeError("negative");
      return money;
    } catch {
      context.addIssue({
        code: "custom",
        message: "must be a non-negative decimal with at most 2 places",
      });
      return z.NEVER;
    }
  });

const payloadSchema = z.object({
  orderId: z.string().trim().min(1).max(255),
  occurredAt: z.string().datetime({ offset: true }),
  clickId: z.string().trim().min(1).max(255).optional(),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(255),
        qty: z.number().int().positive(),
        unitPrice: moneySchema,
        lineDiscount: moneySchema,
        lineVat: moneySchema.optional(),
      }),
    )
    .min(1)
    .max(500),
});

export function parseConversionPayload(
  body: unknown,
): Result<ConversionPayload, PayloadError> {
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return err({
      kind: "invalid",
      issues: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
  }
  return ok({
    orderId: parsed.data.orderId,
    occurredAt: new Date(parsed.data.occurredAt),
    clickId: parsed.data.clickId,
    items: parsed.data.items.map((item) => ({
      ...item,
      lineVat: item.lineVat,
    })),
  });
}

export function parseConversionJson(
  raw: string,
): Result<ConversionPayload, PayloadError> {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return err({ kind: "malformed" });
  }
  return parseConversionPayload(body);
}
