import type { Money, Rate } from "@/src/modules/shared";

export interface CitedLinkTerms {
  readonly clickId: string;
  readonly brandId: string;
  readonly creatorId: string;
  readonly productId: string;
  readonly sku: string;
  readonly rate: Rate;
}

export interface LineItemInput {
  readonly sku: string;
  readonly qty: number;
  readonly unitPrice: Money;
  readonly lineDiscount: Money;
  readonly lineVat: Money | undefined;
}

export interface CalculationInput {
  readonly link: CitedLinkTerms;
  readonly lineItems: readonly LineItemInput[];
  readonly brandVatRegistered: boolean;
}

export interface CalculatedAttribution {
  readonly creatorId: string;
  readonly clickId: string;
  readonly productId: string;
  readonly amount: Money;
}

export interface CalculatedLine {
  readonly sku: string;
  readonly commissionableNet: Money;
  readonly commission: Money;
  readonly attribution: CalculatedAttribution | undefined;
}

export interface CalculationResult {
  readonly lines: readonly CalculatedLine[];
}
