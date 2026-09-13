import {
  recordPayment,
  reversePayment,
  issueInvoice,
  readOwnFinance as own,
  readAdminFinance as admin,
  readFinanceInvoice as invoice,
  previewFinanceInvoice as preview,
  readAdminAccounts as accounts,
  readAdminTransactions as transactions,
  prismaFinanceReads,
  persistPayment,
  persistReversal,
  persistInvoice,
} from "@/src/modules/finance";
const commands = {
  recordPayment: persistPayment,
  reversePayment: persistReversal,
  issueInvoice: persistInvoice,
};
export const recordFinancePayment = recordPayment(commands);
export const reverseFinancePayment = reversePayment(commands);
export const issueFinanceInvoice = issueInvoice(commands);
export const previewFinanceInvoice = preview(prismaFinanceReads);
export const readOwnFinance = own(prismaFinanceReads);
export const readAdminFinance = admin(prismaFinanceReads);
export const readFinanceInvoice = invoice(prismaFinanceReads);
export const readAdminAccounts = accounts(prismaFinanceReads);
export const readAdminTransactions = transactions(prismaFinanceReads);
