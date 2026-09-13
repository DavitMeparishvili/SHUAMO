import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type { DocumentParty, FinanceParty } from "../domain/finance";
import { FinanceOperationError } from "../domain/finance";
import type {
  FinanceReads,
  InvoiceView,
  PaymentView,
  AccountRow,
} from "../ports/finance-repository";
import {
  balanceFor,
  financeEarningsSource,
  partyWhere,
  partyDetails,
  previewFor,
  type FinanceTx,
} from "./prisma-finance-source";
import { financeBalance } from "../domain/balance";
const paymentInclude = {
  recordedBy: { include: { authUser: true } },
  reversal: { select: { id: true } },
} satisfies Prisma.FinancePaymentInclude;
const invoiceInclude = {
  issuedBy: { include: { authUser: true } },
  lines: { orderBy: { attributionId: "asc" as const } },
} satisfies Prisma.FinanceInvoiceInclude;
function paymentView(
  row: Prisma.FinancePaymentGetPayload<{ include: typeof paymentInclude }>,
): PaymentView {
  return {
    id: row.id,
    party: row.brandId
      ? { kind: "brand", id: row.brandId }
      : { kind: "creator", id: row.creatorId! },
    name: (row.partySnapshot as { name: string }).name,
    kind: row.kind,
    amount: row.amount.toFixed(2),
    transferredOn: row.transferredOn.toISOString().slice(0, 10),
    recordedAt: row.recordedAt.toISOString(),
    recordedBy: row.recordedBy.authUser.name,
    bankReference: row.bankReference || "",
    note: row.note || "",
    invoiceId: row.invoiceId,
    reversesId: row.reversesId,
    reversed: !!row.reversal,
  };
}
function invoiceView(
  row: Prisma.FinanceInvoiceGetPayload<{ include: typeof invoiceInclude }>,
): InvoiceView {
  return {
    id: row.id,
    party: row.brandId
      ? { kind: "brand", id: row.brandId }
      : { kind: "creator", id: row.creatorId! },
    number: row.number,
    payer: row.payerSnapshot as unknown as DocumentParty,
    payee: row.payeeSnapshot as unknown as DocumentParty,
    total: row.total.toFixed(2),
    currency: row.currency,
    issuedAt: row.issuedAt.toISOString(),
    issuedBy: row.issuedBy.authUser.name,
    lines: row.lines.map((l) => ({
      attributionId: l.attributionId,
      amount: l.amount.toFixed(2),
      ...(l.snapshot as {
        orderId: string;
        description: string;
        occurredOn: string;
      }),
    })),
  };
}
async function account(
  tx: FinanceTx,
  party: FinanceParty,
  query: {
    page: number;
    invoicePage?: number | undefined;
    pageSize?: number;
    record?: string | undefined;
  },
) {
  let details: DocumentParty;
  try {
    details = await partyDetails(tx, party);
  } catch (e) {
    if (e instanceof FinanceOperationError && e.code === "not_found")
      return undefined;
    throw e;
  }
  const pageSize = query.pageSize || 25,
    where = partyWhere(party),
    invoicePage = query.invoicePage || 1;
  let paymentPage = query.page;
  if (query.record) {
    const original = await tx.financePayment.findFirst({
      where: { ...where, id: query.record },
    });
    if (original) {
      const newer = await tx.financePayment.count({
        where: {
          ...where,
          OR: [
            { recordedAt: { gt: original.recordedAt } },
            { recordedAt: original.recordedAt, id: { gt: original.id } },
          ],
        },
      });
      paymentPage = Math.floor(newer / pageSize) + 1;
    }
  }
  const [balance, payments, invoices, paymentTotal, invoiceTotal] =
    await Promise.all([
      balanceFor(tx, party),
      tx.financePayment.findMany({
        where,
        include: paymentInclude,
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: pageSize,
        skip: (paymentPage - 1) * pageSize,
      }),
      tx.financeInvoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
        take: pageSize,
        skip: (invoicePage - 1) * pageSize,
      }),
      tx.financePayment.count({ where }),
      tx.financeInvoice.count({ where }),
    ]);
  return {
    party,
    name: details.name,
    balance,
    payments: {
      items: payments.map(paymentView),
      page: paymentPage,
      pageSize,
      total: paymentTotal,
    },
    invoices: {
      items: invoices.map(invoiceView),
      page: invoicePage,
      pageSize,
      total: invoiceTotal,
    },
  };
}
export const prismaFinanceReads: FinanceReads = {
  async listAccounts(kind, { query, page }) {
    const table = kind === "brand" ? Prisma.sql`brand` : Prisma.sql`creator`,
      name = kind === "brand" ? Prisma.sql`name` : Prisma.sql`display_name`,
      col = kind === "brand" ? Prisma.sql`brand_id` : Prisma.sql`creator_id`;
    return prisma.$transaction(
      async (tx) => {
        const [rows, count] = await Promise.all([
          tx.$queryRaw<
            {
              id: string;
              name: string;
              earned: Prisma.Decimal;
              paid: Prisma.Decimal;
            }[]
          >(Prisma.sql`
     WITH earnings AS (SELECT ${col} id,SUM(commission_amount) earned FROM (${financeEarningsSource}) e GROUP BY ${col}),
     payments AS (SELECT ${col} id,SUM(CASE WHEN kind='PAYMENT' THEN amount ELSE -amount END) paid FROM finance_payment GROUP BY ${col})
     SELECT a.id, a.${name} name, COALESCE(e.earned,0) earned, COALESCE(p.paid,0) paid
     FROM ${table} a LEFT JOIN earnings e ON e.id=a.id LEFT JOIN payments p ON p.id=a.id
     WHERE a.${name} ILIKE ${`%${query}%`} ORDER BY a.${name},a.id LIMIT 25 OFFSET ${(page - 1) * 25}`),
          tx.$queryRaw<{ total: bigint }[]>(
            Prisma.sql`SELECT COUNT(*) total FROM ${table} WHERE ${name} ILIKE ${`%${query}%`}`,
          ),
        ]);
        return {
          items: rows.map((r): AccountRow => ({
            party: { kind, id: r.id },
            name: r.name,
            balance: financeBalance(r.earned.toString(), r.paid.toString()),
          })),
          page,
          pageSize: 25,
          total: Number(count[0]!.total),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  },
  async listTransactions({ party, query, page }) {
    const where: Prisma.FinancePaymentWhereInput = {
      ...(party ? partyWhere(party) : {}),
      ...(query
        ? {
            OR: [
              { bankReference: { contains: query, mode: "insensitive" } },
              { brand: { name: { contains: query, mode: "insensitive" } } },
              {
                creator: {
                  displayName: { contains: query, mode: "insensitive" },
                },
              },
              ...(/^[a-f0-9-]{36}$/i.test(query) ? [{ id: query }] : []),
            ],
          }
        : {}),
    };
    return prisma.$transaction(
      async (tx) => {
        const [rows, total] = await Promise.all([
          tx.financePayment.findMany({
            where,
            include: paymentInclude,
            orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
            take: 25,
            skip: (page - 1) * 25,
          }),
          tx.financePayment.count({ where }),
        ]);
        return { items: rows.map(paymentView), page, pageSize: 25, total };
      },
      { isolationLevel: "RepeatableRead" },
    );
  },
  getAccount: (party, query) =>
    prisma.$transaction((tx) => account(tx, party, query), {
      isolationLevel: "RepeatableRead",
    }),
  getSummary: (party) =>
    prisma.$transaction((tx) => account(tx, party, { page: 1, pageSize: 5 }), {
      isolationLevel: "RepeatableRead",
    }),
  previewInvoice: (party) =>
    prisma.$transaction((tx) => previewFor(tx, party), {
      isolationLevel: "RepeatableRead",
    }),
  async getInvoice(id) {
    const row = await prisma.financeInvoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    return row ? invoiceView(row) : undefined;
  },
};
