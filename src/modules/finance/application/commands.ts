import type { z } from "zod";
import { requireAdmin, type Viewer } from "@/src/modules/identity";
import { err, ok, type Result } from "@/src/modules/shared";
import { FinanceOperationError, type FinanceError } from "../domain/finance";
import type { FinanceCommands } from "../ports/finance-repository";
import {
  paymentSchema,
  reversalSchema,
  invoiceSchema,
} from "./finance-validation";
function command<T>(
  schema: z.ZodType<T>,
  run: (actor: string, input: T) => Promise<string>,
) {
  return async (
    viewer: Viewer,
    input: unknown,
  ): Promise<Result<{ id: string }, FinanceError>> => {
    const actor = requireAdmin(viewer);
    if (!actor.ok) return actor;
    const parsed = schema.safeParse(input);
    if (!parsed.success) return err("invalid_input");
    try {
      return ok({ id: await run(actor.value.userId, parsed.data) });
    } catch (e) {
      if (e instanceof FinanceOperationError) return err(e.code);
      throw e;
    }
  };
}
export const recordPayment = (repo: FinanceCommands) =>
  command(paymentSchema, repo.recordPayment);
export const reversePayment = (repo: FinanceCommands) =>
  command(reversalSchema, repo.reversePayment);
export const issueInvoice = (repo: FinanceCommands) =>
  command(invoiceSchema, repo.issueInvoice);
