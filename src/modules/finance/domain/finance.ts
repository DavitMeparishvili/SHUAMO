export type FinanceParty = { kind: "brand" | "creator"; id: string };
export interface FinanceBalance {
  earned: string;
  payments: string;
  outstanding: string;
}
export interface DocumentParty {
  name: string;
  identification: string;
  address: string;
  bank: string;
  iban: string;
}
export interface InvoiceCandidate {
  attributionId: string;
  orderId: string;
  description: string;
  occurredOn: string;
  currentAmount: string;
  invoicedAmount: string;
}
export interface InvoiceLineSnapshot {
  attributionId: string;
  orderId: string;
  description: string;
  occurredOn: string;
  amount: string;
}
export type FinanceError =
  | "unauthenticated"
  | "wrong_capability"
  | "not_found"
  | "invalid_input"
  | "invoice_party_mismatch"
  | "request_conflict"
  | "nothing_to_invoice"
  | "preview_changed"
  | "invalid_reversal"
  | "retry_later";
export class FinanceOperationError extends Error {
  constructor(public readonly code: FinanceError) {
    super(code);
  }
}
