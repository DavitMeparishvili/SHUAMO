import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import { FinanceOperationError } from "../domain/finance";
import type { FinanceTx } from "./prisma-finance-source";
export async function retryFinanceTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2034"
      )
        throw e;
      if (attempt === 2) throw new FinanceOperationError("retry_later");
    }
  }
  throw new FinanceOperationError("retry_later");
}
export function savedRequest(
  row: { id: string; requestHash: string } | null,
  hash: string,
) {
  if (!row) return undefined;
  if (row.requestHash !== hash)
    throw new FinanceOperationError("request_conflict");
  return row.id;
}
export async function financialWrite(
  table: "payment" | "invoice",
  key: string,
  hash: string,
  work: (tx: FinanceTx) => Promise<string>,
): Promise<string> {
  try {
    return await retryFinanceTransaction(() =>
      prisma.$transaction(work, {
        isolationLevel: "Serializable",
        timeout: 20000,
      }),
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      JSON.stringify(e.meta).match(/request_key|requestKey/)
    ) {
      const row =
        table === "payment"
          ? await prisma.financePayment.findUnique({
              where: { requestKey: key },
            })
          : await prisma.financeInvoice.findUnique({
              where: { requestKey: key },
            });
      const id = savedRequest(row, hash);
      if (id) return id;
    }
    throw e;
  }
}
