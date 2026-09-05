import type { Money } from "@/src/modules/shared";
import type { ConversionPayload, ConversionLineInput } from "../domain/payload";
import type {
  ConversionStatus,
  OrderAction,
} from "../domain/order-transitions";

export interface AttributionView {
  readonly clickId: string;
  readonly creatorId: string;
  readonly creatorName: string;
  readonly productId: string;
  readonly commissionAmount: string;
}

export interface ConversionItemView {
  readonly id: string;
  readonly sku: string;
  readonly qty: number;
  readonly unitPrice: string;
  readonly lineDiscount: string;
  readonly lineVat: string;
  readonly commissionableNet: string;
  readonly attribution: AttributionView | undefined;
}

export interface ConversionView {
  readonly id: string;
  readonly orderId: string;
  readonly occurredAt: string;
  readonly status: ConversionStatus;
  readonly confirmedAt: string;
  readonly commissionAmount: string;
  readonly items: readonly ConversionItemView[];
}

export interface ExistingConversion {
  readonly requestFingerprint: string;
  readonly view: ConversionView;
}

export interface PersistedLine {
  readonly input: ConversionLineInput;
  readonly lineVat: Money;
  readonly commissionableNet: Money;
  readonly attribution:
    | {
        readonly clickId: string;
        readonly creatorId: string;
        readonly productId: string;
        readonly commissionAmount: Money;
      }
    | undefined;
}

export interface PersistConversionInput {
  readonly brandId: string;
  readonly payload: ConversionPayload;
  readonly requestFingerprint: string;
  readonly confirmedAt: Date;
  readonly lines: readonly PersistedLine[];
}

export type CreateConversionResult =
  | { readonly kind: "created"; readonly view: ConversionView }
  | { readonly kind: "existing"; readonly existing: ExistingConversion }
  | { readonly kind: "click_conflict" };

export interface ConversionRepository {
  findByOrder(
    brandId: string,
    orderId: string,
  ): Promise<ExistingConversion | undefined>;
  create(input: PersistConversionInput): Promise<CreateConversionResult>;
  decide(input: {
    readonly brandId: string;
    readonly actorId: string;
    readonly conversionId: string;
    readonly action: OrderAction;
    readonly now: Date;
  }): Promise<
    | {
        readonly ok: true;
        readonly value: { readonly status: ConversionStatus };
      }
    | {
        readonly ok: false;
        readonly error: "not_found" | "illegal_transition";
      }
  >;
}
