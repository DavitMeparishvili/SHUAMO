import Decimal from "decimal.js";
import { createHash } from "node:crypto";
import type {
  FinanceParty,
  InvoiceCandidate,
  InvoiceLineSnapshot,
} from "./finance";
export function invoiceLines(
  candidates: InvoiceCandidate[],
): InvoiceLineSnapshot[] {
  return candidates.flatMap((c) => {
    const amount = new Decimal(c.currentAmount).minus(c.invoicedAmount);
    return amount.isZero()
      ? []
      : [
          {
            attributionId: c.attributionId,
            orderId: c.orderId,
            description: c.description,
            occurredOn: c.occurredOn,
            amount: amount.toFixed(2),
          },
        ];
  });
}
export const financeHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function invoicePreviewHash(
  party: FinanceParty,
  candidates: InvoiceCandidate[],
) {
  return financeHash({
    party,
    candidates: [...candidates]
      .sort((a, b) => a.attributionId.localeCompare(b.attributionId))
      .map((c) => ({
        attributionId: c.attributionId,
        orderId: c.orderId,
        description: c.description,
        occurredOn: c.occurredOn,
        currentAmount: new Decimal(c.currentAmount).toFixed(2),
        invoicedAmount: new Decimal(c.invoicedAmount).toFixed(2),
      })),
  });
}
