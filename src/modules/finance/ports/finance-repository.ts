import type {
  DocumentParty,
  FinanceBalance,
  FinanceParty,
  InvoiceLineSnapshot,
} from "../domain/finance";
export interface RecordPaymentInput {
  requestKey: string;
  party: FinanceParty;
  amount: string;
  transferredOn: string;
  bankReference: string;
  note: string;
  invoiceId?: string | undefined;
}
export interface ReversePaymentInput {
  requestKey: string;
  paymentId: string;
  reason: string;
}
export interface IssueInvoiceInput {
  requestKey: string;
  party: FinanceParty;
  previewHash: string;
  payer: DocumentParty;
  payee: DocumentParty;
}
export interface InvoicePreview {
  party: FinanceParty;
  previewHash: string;
  payer: DocumentParty;
  payee: DocumentParty;
  lines: InvoiceLineSnapshot[];
  total: string;
  balance: FinanceBalance;
}
export interface FinanceCommands {
  recordPayment(actorId: string, input: RecordPaymentInput): Promise<string>;
  reversePayment(actorId: string, input: ReversePaymentInput): Promise<string>;
  issueInvoice(actorId: string, input: IssueInvoiceInput): Promise<string>;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface PaymentView {
  id: string;
  party: FinanceParty;
  name: string;
  kind: "PAYMENT" | "REVERSAL";
  amount: string;
  transferredOn: string;
  recordedAt: string;
  recordedBy: string;
  bankReference: string;
  note: string;
  invoiceId: string | null;
  reversesId: string | null;
  reversed: boolean;
}
export interface InvoiceView {
  id: string;
  party: FinanceParty;
  number: string;
  payer: DocumentParty;
  payee: DocumentParty;
  total: string;
  currency: string;
  issuedAt: string;
  issuedBy: string;
  lines: InvoiceLineSnapshot[];
}
export interface AccountRow {
  party: FinanceParty;
  name: string;
  balance: FinanceBalance;
}
export interface AdminAccountRow extends AccountRow {
  email: string;
  phone: string | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  profileStatus: "DRAFT" | "PUBLISHED" | null;
}
export interface AccountFinance extends AccountRow {
  payments: Page<PaymentView>;
  invoices: Page<InvoiceView>;
}
export interface FinanceReads {
  listAccounts(
    kind: FinanceParty["kind"],
    query: { query: string; page: number },
  ): Promise<Page<AdminAccountRow>>;
  listTransactions(query: {
    party?: FinanceParty;
    query: string;
    page: number;
  }): Promise<Page<PaymentView>>;
  getAccount(
    party: FinanceParty,
    query: {
      page: number;
      invoicePage?: number | undefined;
      pageSize?: number;
      record?: string | undefined;
    },
  ): Promise<AccountFinance | undefined>;
  getSummary(party: FinanceParty): Promise<AccountFinance | undefined>;
  previewInvoice(party: FinanceParty): Promise<InvoicePreview>;
  getInvoice(id: string): Promise<InvoiceView | undefined>;
}
