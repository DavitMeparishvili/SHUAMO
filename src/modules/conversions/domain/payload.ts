import type { Money } from "@/src/modules/shared";

export interface ConversionLineInput {
  readonly sku: string;
  readonly qty: number;
  readonly unitPrice: Money;
  readonly lineDiscount: Money;
  readonly lineVat: Money | undefined;
}

export interface ConversionPayload {
  readonly orderId: string;
  readonly occurredAt: Date;
  readonly clickId: string | undefined;
  readonly items: readonly ConversionLineInput[];
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function isTimestampAcceptable(occurredAt: Date, now: Date): boolean {
  return Math.abs(occurredAt.getTime() - now.getTime()) <= FORTY_EIGHT_HOURS_MS;
}
