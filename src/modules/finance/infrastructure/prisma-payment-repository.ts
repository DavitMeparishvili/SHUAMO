import { Prisma } from "@/src/generated/prisma/client";
import { financeHash } from "../domain/invoice-lines";
import { FinanceOperationError } from "../domain/finance";
import type {
  RecordPaymentInput,
  ReversePaymentInput,
} from "../ports/finance-repository";
import { partyDetails, partyWhere } from "./prisma-finance-source";
import { financialWrite, savedRequest } from "./finance-retry";
export async function persistPayment(
  actorId: string,
  input: RecordPaymentInput,
) {
  const hash = financeHash({ operation: "payment", actorId, input });
  return financialWrite("payment", input.requestKey, hash, async (tx) => {
    const existing = savedRequest(
      await tx.financePayment.findUnique({
        where: { requestKey: input.requestKey },
      }),
      hash,
    );
    if (existing) return existing;
    const details = await partyDetails(tx, input.party);
    if (
      input.invoiceId &&
      !(await tx.financeInvoice.findFirst({
        where: { id: input.invoiceId, ...partyWhere(input.party) },
      }))
    )
      throw new FinanceOperationError("invoice_party_mismatch");
    const row = await tx.financePayment.create({
      data: {
        requestKey: input.requestKey,
        requestHash: hash,
        kind: "PAYMENT",
        ...partyWhere(input.party),
        amount: input.amount,
        transferredOn: new Date(`${input.transferredOn}T00:00:00Z`),
        bankReference: input.bankReference || null,
        note: input.note || null,
        invoiceId: input.invoiceId || null,
        partySnapshot: { name: details.name },
        recordedById: actorId,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "finance.payment_recorded",
        entityType: "finance_payment",
        entityId: row.id,
        changes: { amount: input.amount, party: input.party },
      },
    });
    return row.id;
  });
}
export async function persistReversal(
  actorId: string,
  input: ReversePaymentInput,
) {
  const hash = financeHash({ operation: "reversal", actorId, input });
  return financialWrite("payment", input.requestKey, hash, async (tx) => {
    const existing = savedRequest(
      await tx.financePayment.findUnique({
        where: { requestKey: input.requestKey },
      }),
      hash,
    );
    if (existing) return existing;
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM finance_payment WHERE id=${input.paymentId}::uuid FOR UPDATE`,
    );
    const original = await tx.financePayment.findUnique({
      where: { id: input.paymentId },
      include: { reversal: true },
    });
    if (!original) throw new FinanceOperationError("not_found");
    if (original.kind !== "PAYMENT")
      throw new FinanceOperationError("invalid_reversal");
    if (original.reversal) return original.reversal.id;
    const row = await tx.financePayment.create({
      data: {
        requestKey: input.requestKey,
        requestHash: hash,
        kind: "REVERSAL",
        brandId: original.brandId,
        creatorId: original.creatorId,
        amount: original.amount,
        transferredOn: original.transferredOn,
        bankReference: original.bankReference,
        note: input.reason,
        invoiceId: original.invoiceId,
        partySnapshot: original.partySnapshot as Prisma.InputJsonValue,
        recordedById: actorId,
        reversesId: original.id,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "finance.payment_reversed",
        entityType: "finance_payment",
        entityId: row.id,
        changes: { reversesId: original.id, reason: input.reason },
      },
    });
    return row.id;
  });
}
