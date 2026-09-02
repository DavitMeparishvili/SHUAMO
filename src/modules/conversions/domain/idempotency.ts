import type { ConversionPayload } from "./payload";

function canonicalItems(payload: ConversionPayload) {
  return payload.items
    .map((item) => ({
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.unitPrice.toStorageString(),
      lineDiscount: item.lineDiscount.toStorageString(),
      // null preserves the submitted distinction between omitted VAT and an
      // explicit zero. It never derives from the brand's mutable VAT status.
      lineVat: item.lineVat?.toStorageString() ?? null,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

export function canonicalRequestIdentity(payload: ConversionPayload): string {
  return JSON.stringify({
    orderId: payload.orderId,
    occurredAt: payload.occurredAt.toISOString(),
    clickId: payload.clickId ?? null,
    items: canonicalItems(payload),
  });
}
