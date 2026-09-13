import Decimal from "decimal.js";
import { Prisma } from "@/src/generated/prisma/client";
import { financeHash } from "../domain/invoice-lines";
import { tbilisiToday } from "../domain/finance-input";
import { FinanceOperationError } from "../domain/finance";
import type { IssueInvoiceInput } from "../ports/finance-repository";
import { previewFor, partyWhere } from "./prisma-finance-source";
import { financialWrite, savedRequest } from "./finance-retry";
export async function persistInvoice(
  actorId: string,
  input: IssueInvoiceInput,
) {
  const hash = financeHash({ operation: "invoice", actorId, input });
  return financialWrite("invoice", input.requestKey, hash, async (tx) => {
    const table =
      input.party.kind === "brand" ? Prisma.sql`brand` : Prisma.sql`creator`;
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM ${table} WHERE id=${input.party.id}::uuid FOR UPDATE`,
    );
    const existing = savedRequest(
      await tx.financeInvoice.findUnique({
        where: { requestKey: input.requestKey },
      }),
      hash,
    );
    if (existing) return existing;
    const preview = await previewFor(tx, input.party);
    if (preview.previewHash !== input.previewHash)
      throw new FinanceOperationError("preview_changed");
    if (!preview.lines.length)
      throw new FinanceOperationError("nothing_to_invoice");
    if (new Decimal(preview.total).abs().gt("9999999999999999.99"))
      throw new FinanceOperationError("invalid_input");
    const kind = input.party.kind === "brand" ? "BRAND" : "CREATOR",
      year = Number(tbilisiToday().slice(0, 4));
    const counter = await tx.financeInvoiceCounter.upsert({
      where: { kind_year: { kind, year } },
      create: { kind, year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const number = `XU-${kind === "BRAND" ? "B" : "C"}-${year}-${String(counter.lastValue).padStart(6, "0")}`;
    const row = await tx.financeInvoice.create({
      data: {
        requestKey: input.requestKey,
        requestHash: hash,
        previewHash: input.previewHash,
        number,
        ...partyWhere(input.party),
        payerSnapshot: { ...input.payer },
        payeeSnapshot: { ...input.payee },
        total: preview.total,
        issuedById: actorId,
        lines: {
          create: preview.lines.map((l) => ({
            attributionId: l.attributionId,
            amount: l.amount,
            snapshot: {
              orderId: l.orderId,
              description: l.description,
              occurredOn: l.occurredOn,
            },
          })),
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: "finance.invoice_issued",
        entityType: "finance_invoice",
        entityId: row.id,
        changes: { number, total: preview.total, party: input.party },
      },
    });
    return row.id;
  });
}
