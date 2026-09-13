"use server";
import { revalidatePath } from "next/cache";
import { currentViewer } from "@/src/modules/identity";
import {
  recordFinancePayment,
  reverseFinancePayment,
  issueFinanceInvoice,
  previewFinanceInvoice,
} from "@/src/infrastructure/finance-services";
import type { FinanceParty } from "@/src/modules/finance";
function refreshFinance() {
  for (const locale of ["en", "ka"]) {
    revalidatePath(`/${locale}/admin`, "layout");
    revalidatePath(`/${locale}/brand`, "layout");
    revalidatePath(`/${locale}/creator`, "layout");
  }
}
export async function recordPaymentAction(input: unknown) {
  const result = await recordFinancePayment(await currentViewer(), input);
  if (result.ok) refreshFinance();
  return result;
}
export async function reversePaymentAction(input: unknown) {
  const result = await reverseFinancePayment(await currentViewer(), input);
  if (result.ok) refreshFinance();
  return result;
}
export async function issueInvoiceAction(input: unknown) {
  const result = await issueFinanceInvoice(await currentViewer(), input);
  if (result.ok) refreshFinance();
  return result;
}
export async function previewInvoiceAction(party: FinanceParty) {
  return previewFinanceInvoice(await currentViewer(), party);
}
