import { z } from "zod";
import { paymentAmount, transferDate } from "../domain/finance-input";
const amount = z.string().transform((v, ctx) => {
  try {
    return paymentAmount(v);
  } catch {
    ctx.addIssue({ code: "custom", message: "invalid_input" });
    return z.NEVER;
  }
});
const date = z.string().refine((v) => {
  try {
    transferDate(v);
    return true;
  } catch {
    return false;
  }
});
export const partySchema = z.object({
  kind: z.enum(["brand", "creator"]),
  id: z.uuid(),
});
const document = z.object({
  name: z.string().trim().min(1).max(200),
  identification: z.string().trim().max(200),
  address: z.string().trim().max(500),
  bank: z.string().trim().max(200),
  iban: z.string().trim().max(100),
});
export const paymentSchema = z.object({
  requestKey: z.uuid(),
  party: partySchema,
  amount,
  transferredOn: date,
  bankReference: z.string().trim().max(160),
  note: z.string().trim().max(1000),
  invoiceId: z.uuid().optional(),
});
export const reversalSchema = z.object({
  requestKey: z.uuid(),
  paymentId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});
export const invoiceSchema = z.object({
  requestKey: z.uuid(),
  party: partySchema,
  previewHash: z.string().regex(/^[a-f0-9]{64}$/),
  payer: document,
  payee: document,
});
