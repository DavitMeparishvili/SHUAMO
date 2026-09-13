import Decimal from "decimal.js";
import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/infrastructure/db/client";
import type {
  AdminPerformanceFinance,
  PerformanceFinanceQuery,
} from "../ports/admin-performance-finance";
import { financeEarningsSource } from "./prisma-finance-source";
export async function prismaAdminPerformanceFinance(
  q: PerformanceFinanceQuery,
): Promise<AdminPerformanceFinance> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          kind: "brand" | "creator";
          outstanding: Prisma.Decimal;
          period: Prisma.Decimal;
        }[]
      >(Prisma.sql`
   WITH earnings AS (${financeEarningsSource}), account_earnings AS (
    SELECT brand_id id,'brand' kind,SUM(commission_amount) earned FROM earnings GROUP BY brand_id UNION ALL
    SELECT creator_id id,'creator' kind,SUM(commission_amount) earned FROM earnings GROUP BY creator_id
   ), payments AS (
    SELECT COALESCE(brand_id,creator_id) id,CASE WHEN brand_id IS NOT NULL THEN 'brand' ELSE 'creator' END kind,
    SUM(CASE WHEN kind='PAYMENT' THEN amount ELSE -amount END) paid,
    COALESCE(SUM(CASE WHEN kind='PAYMENT' THEN amount ELSE -amount END) FILTER (WHERE transferred_on>=${q.from}::date AND transferred_on<=${q.to}::date),0) period
    FROM finance_payment GROUP BY brand_id,creator_id
   ), accounts AS (SELECT id,'brand' kind FROM brand UNION ALL SELECT id,'creator' kind FROM creator)
   SELECT a.id,a.kind,COALESCE(e.earned,0)-COALESCE(p.paid,0) outstanding,COALESCE(p.period,0) period FROM accounts a
   LEFT JOIN account_earnings e ON e.id=a.id AND e.kind=a.kind LEFT JOIN payments p ON p.id=a.id AND p.kind=a.kind`);
      const sums = {
        brandOutstanding: new Decimal(0),
        brandCredits: new Decimal(0),
        creatorUnpaid: new Decimal(0),
        creatorOverpayments: new Decimal(0),
        brandReceipts: new Decimal(0),
        creatorPayouts: new Decimal(0),
      };
      const brands: AdminPerformanceFinance["brands"] = [],
        creators: AdminPerformanceFinance["creators"] = [],
        brandIds = new Set(q.brandIds),
        creatorIds = new Set(q.creatorIds);
      for (const r of rows) {
        const amount = new Decimal(r.outstanding.toString());
        const key =
          r.kind === "brand"
            ? amount.isNegative()
              ? "brandCredits"
              : "brandOutstanding"
            : amount.isNegative()
              ? "creatorOverpayments"
              : "creatorUnpaid";
        sums[key] = sums[key].plus(amount.abs());
        const cash = r.kind === "brand" ? "brandReceipts" : "creatorPayouts";
        sums[cash] = sums[cash].plus(r.period.toString());
        if (r.kind === "brand" && brandIds.has(r.id))
          brands.push({
            id: r.id,
            periodReceipts: r.period.toFixed(2),
            outstanding: amount.toFixed(2),
          });
        if (r.kind === "creator" && creatorIds.has(r.id))
          creators.push({
            id: r.id,
            periodPayouts: r.period.toFixed(2),
            unpaid: amount.toFixed(2),
          });
      }
      return {
        period: {
          from: q.from,
          to: q.to,
          brandReceipts: sums.brandReceipts.toFixed(2),
          creatorPayouts: sums.creatorPayouts.toFixed(2),
        },
        current: {
          brandOutstanding: sums.brandOutstanding.toFixed(2),
          brandCredits: sums.brandCredits.toFixed(2),
          creatorUnpaid: sums.creatorUnpaid.toFixed(2),
          creatorOverpayments: sums.creatorOverpayments.toFixed(2),
        },
        brands,
        creators,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
