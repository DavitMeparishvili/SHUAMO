import { z } from "zod";
import { requireAdmin, type Viewer } from "@/src/modules/identity";
import { err, ok } from "@/src/modules/shared";
import { FinanceOperationError, type FinanceParty } from "../domain/finance";
import type { FinanceReads } from "../ports/finance-repository";
import { partySchema } from "./finance-validation";
export function ownFinanceParty(viewer: Viewer): FinanceParty | undefined {
  if (viewer.kind === "brand") return { kind: "brand", id: viewer.brandId };
  if (viewer.kind === "creator")
    return { kind: "creator", id: viewer.creatorId };
}
const pageSchema = z.object({
  page: z.number().int().min(1).max(1000000).default(1),
  record: z.uuid().optional(),
  invoicePage: z.number().int().min(1).max(1000000).optional(),
});
export const readOwnFinance =
  (repo: FinanceReads) =>
  async (
    viewer: Viewer,
    query: { page: number; invoicePage?: number; record?: string } = {
      page: 1,
    },
    summary = false,
  ) => {
    const party = ownFinanceParty(viewer);
    if (!party)
      return err(
        viewer.kind === "anonymous"
          ? ("unauthenticated" as const)
          : ("wrong_capability" as const),
      );
    const parsed = pageSchema.safeParse(query);
    if (!parsed.success) return err("invalid_input" as const);
    const value = await (summary
      ? repo.getSummary(party)
      : repo.getAccount(party, parsed.data));
    return value ? ok(value) : err("not_found" as const);
  };
export const readAdminFinance =
  (repo: FinanceReads) =>
  async (
    viewer: Viewer,
    party: FinanceParty,
    query: { page: number; invoicePage?: number; record?: string } = {
      page: 1,
    },
  ) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    const parsed = pageSchema.safeParse(query);
    if (!partySchema.safeParse(party).success || !parsed.success)
      return err("invalid_input" as const);
    const value = await repo.getAccount(party, parsed.data);
    return value ? ok(value) : err("not_found" as const);
  };
export const readFinanceInvoice =
  (repo: FinanceReads) => async (viewer: Viewer, id: string) => {
    if (viewer.kind === "anonymous") return err("unauthenticated" as const);
    if (!z.uuid().safeParse(id).success) return err("not_found" as const);
    const value = await repo.getInvoice(id),
      own = ownFinanceParty(viewer);
    if (
      !value ||
      (!requireAdmin(viewer).ok &&
        (own?.kind !== value.party.kind || own.id !== value.party.id))
    )
      return err("not_found" as const);
    return ok(value);
  };
export const previewFinanceInvoice =
  (repo: FinanceReads) => async (viewer: Viewer, party: FinanceParty) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    if (!partySchema.safeParse(party).success)
      return err("invalid_input" as const);
    try {
      return ok(await repo.previewInvoice(party));
    } catch (e) {
      if (e instanceof FinanceOperationError) return err(e.code);
      throw e;
    }
  };
export const readAdminAccounts =
  (repo: FinanceReads) =>
  async (
    viewer: Viewer,
    kind: FinanceParty["kind"],
    query: { query: string; page: number },
  ) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    if (
      !z.enum(["brand", "creator"]).safeParse(kind).success ||
      !pageSchema.safeParse(query).success ||
      query.query.length > 120
    )
      return err("invalid_input" as const);
    return ok(await repo.listAccounts(kind, query));
  };
export const readAdminTransactions =
  (repo: FinanceReads) =>
  async (viewer: Viewer, query: { query: string; page: number }) => {
    const access = requireAdmin(viewer);
    if (!access.ok) return access;
    if (!pageSchema.safeParse(query).success || query.query.length > 120)
      return err("invalid_input" as const);
    return ok(await repo.listTransactions(query));
  };
