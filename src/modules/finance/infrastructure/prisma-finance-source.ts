import Decimal from "decimal.js";
import { Prisma } from "@/src/generated/prisma/client";
import type {
  FinanceParty,
  InvoiceCandidate,
  DocumentParty,
} from "../domain/finance";
import { FinanceOperationError } from "../domain/finance";
import { financeBalance } from "../domain/balance";
import { invoiceLines, invoicePreviewHash } from "../domain/invoice-lines";
import { platformDocument } from "./finance-config";
export type FinanceTx = Prisma.TransactionClient;
export const partyWhere = (party: FinanceParty) =>
  party.kind === "brand" ? { brandId: party.id } : { creatorId: party.id };
export const partyColumn = (party: FinanceParty) =>
  party.kind === "brand" ? Prisma.sql`brand_id` : Prisma.sql`creator_id`;
// One row per canonical attribution. All consistency checks precede aggregation.
export const financeEarningsSource = Prisma.sql`
 SELECT a.id, a.creator_id, cv.brand_id, a.product_id, a.commission_amount,
 cv.order_id, cv.occurred_at, p.title
 FROM attribution a JOIN conversion_item ci ON ci.id=a.conversion_item_id
 JOIN conversion cv ON cv.id=ci.conversion_id JOIN click c ON c.id=a.click_id
 JOIN tracking_link tl ON tl.id=c.tracking_link_id JOIN product p ON p.id=a.product_id
 WHERE a.status='CANONICAL' AND cv.status='CONFIRMED'
 AND tl.creator_id=a.creator_id AND tl.product_id=a.product_id
 AND c.brand_id=cv.brand_id AND p.brand_id=cv.brand_id`;
export async function partyDetails(
  tx: FinanceTx,
  party: FinanceParty,
): Promise<DocumentParty> {
  const row =
    party.kind === "brand"
      ? await tx.brand.findUnique({ where: { id: party.id } })
      : await tx.creator.findUnique({ where: { id: party.id } });
  if (!row) throw new FinanceOperationError("not_found");
  return {
    name: "name" in row ? row.name : row.payoutName || row.displayName,
    identification: "",
    address: "",
    bank: "payoutBank" in row ? row.payoutBank || "" : "",
    iban: "payoutIban" in row ? row.payoutIban || "" : "",
  };
}
export async function balanceFor(tx: FinanceTx, party: FinanceParty) {
  const [earnings, payments] = await Promise.all([
    tx.$queryRaw<{ earned: Prisma.Decimal }[]>(
      Prisma.sql`SELECT COALESCE(SUM(commission_amount),0) earned FROM (${financeEarningsSource}) e WHERE ${partyColumn(party)}=${party.id}::uuid`,
    ),
    tx.$queryRaw<{ paid: Prisma.Decimal; reversed: Prisma.Decimal }[]>(
      Prisma.sql`SELECT COALESCE(SUM(amount) FILTER (WHERE kind='PAYMENT'),0) paid, COALESCE(SUM(amount) FILTER (WHERE kind='REVERSAL'),0) reversed FROM finance_payment WHERE ${partyColumn(party)}=${party.id}::uuid`,
    ),
  ]);
  return financeBalance(
    earnings[0]!.earned.toString(),
    payments[0]!.paid.toString(),
    payments[0]!.reversed.toString(),
  );
}
export async function invoiceCandidates(
  tx: FinanceTx,
  party: FinanceParty,
): Promise<InvoiceCandidate[]> {
  const [eligible, previous] = await Promise.all([
    tx.$queryRaw<
      {
        id: string;
        commission_amount: Prisma.Decimal;
        order_id: string;
        occurred_at: Date;
        title: string;
      }[]
    >(
      Prisma.sql`SELECT * FROM (${financeEarningsSource}) e WHERE ${partyColumn(party)}=${party.id}::uuid`,
    ),
    tx.financeInvoiceLine.findMany({
      where: { invoice: partyWhere(party) },
      orderBy: [{ invoice: { issuedAt: "asc" } }, { id: "asc" }],
    }),
  ]);
  const candidates = new Map<string, InvoiceCandidate>();
  for (const row of previous) {
    const snapshot = row.snapshot as {
      orderId: string;
      description: string;
      occurredOn: string;
    };
    const old = candidates.get(row.attributionId);
    candidates.set(row.attributionId, {
      attributionId: row.attributionId,
      ...snapshot,
      currentAmount: "0.00",
      invoicedAmount: new Decimal(old?.invoicedAmount || 0)
        .plus(row.amount.toString())
        .toFixed(2),
    });
  }
  for (const row of eligible) {
    candidates.set(row.id, {
      attributionId: row.id,
      orderId: row.order_id,
      description: row.title,
      occurredOn: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tbilisi",
      }).format(row.occurred_at),
      currentAmount: row.commission_amount.toFixed(2),
      invoicedAmount: candidates.get(row.id)?.invoicedAmount || "0.00",
    });
  }
  return [...candidates.values()].sort((a, b) =>
    a.attributionId.localeCompare(b.attributionId),
  );
}
export async function previewFor(tx: FinanceTx, party: FinanceParty) {
  const [details, candidates, balance] = await Promise.all([
    partyDetails(tx, party),
    invoiceCandidates(tx, party),
    balanceFor(tx, party),
  ]);
  const lines = invoiceLines(candidates),
    platform = platformDocument();
  return {
    party,
    payer: party.kind === "brand" ? details : platform,
    payee: party.kind === "brand" ? platform : details,
    previewHash: invoicePreviewHash(party, candidates),
    lines,
    total: lines.reduce((s, l) => s.plus(l.amount), new Decimal(0)).toFixed(2),
    balance,
  };
}
